import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getPrisma } from '@/lib/db'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { rateLimit } from '@/middleware/rate-limit'
import {
  readJsonBody,
  PayloadTooLargeError,
  InvalidJsonError,
} from '@/lib/request'

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
    const limit = rateLimit(request)
    if (!limit.ok) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type invalide' }, { status: 415 })
    }
    const maxBody = 1_000_000
    let json: unknown
    try {
      json = await readJsonBody(request, maxBody)
    } catch (err) {
      if (err instanceof PayloadTooLargeError) {
        return NextResponse.json({ error: 'Corps de requête trop volumineux' }, { status: 413 })
      }
      if (err instanceof InvalidJsonError) {
        return NextResponse.json({ error: 'Requête JSON invalide' }, { status: 400 })
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
    const username = parsed.data.username.trim().toLowerCase()
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