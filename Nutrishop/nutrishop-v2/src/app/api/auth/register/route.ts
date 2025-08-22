import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getPrisma } from '@/lib/db'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { rateLimit } from '@/lib/rate-limit'
import { parseJsonBody } from '@/lib/api-utils'
import { PayloadTooLargeError, InvalidJsonError, PAYLOAD_TOO_LARGE, JSON_INVALIDE, TOO_MANY_REQUESTS } from '@/lib/errors'

const registerSchema = z.object({
  email: z.string().trim().email(),
  username: z.string().trim().min(3),
  password: z
    .string()
    .min(8)
    .regex(/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9])/, {
      message:
        'Le mot de passe doit contenir au moins 8 caractères avec majuscule, minuscule, chiffre et symbole'
    })
})

export async function POST(request: NextRequest) {
  try {
    const limit = await rateLimit(request)
    if (!limit.ok) {
      return NextResponse.json({ error: TOO_MANY_REQUESTS }, { status: 429 })
    }
    let json: unknown
    try {
      const parsedReq = await parseJsonBody(request)
      if (!parsedReq.ok) {
        return NextResponse.json({ error: 'Content-Type invalide' }, { status: 415 })
      }
      json = parsedReq.data
    } catch (err) {
      if (err instanceof PayloadTooLargeError) {
        return NextResponse.json({ error: PAYLOAD_TOO_LARGE }, { status: 413 })
      }
      if (err instanceof InvalidJsonError) {
        return NextResponse.json({ error: JSON_INVALIDE }, { status: 400 })
      }
      throw err
    }
    const parsed = registerSchema.safeParse(json)
    if (!parsed.success) {
      const passwordError = parsed.error.issues.find(i => i.path[0] === 'password')
      const message = passwordError
        ? 'Mot de passe invalide'
        : "Données d'inscription invalides"
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const prisma = getPrisma()
    const email = parsed.data.email.trim().toLowerCase()
    const username = parsed.data.username.trim()
    const usernameNormalized = username.toLowerCase()
    const { password } = parsed.data

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user and profile atomically
    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            username,
            usernameNormalized,
            password: hashedPassword,
          }
        })

        await tx.profile.create({
          data: {
            userId: user.id,
          }
        })
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return NextResponse.json(
          { error: "Un utilisateur avec cet email ou ce nom d'utilisateur existe déjà" },
          { status: 400 }
        )
      }
      throw error
    }
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error("Erreur d'inscription:", error)
    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'inscription" },
      { status: 500 }
    )
  }
}