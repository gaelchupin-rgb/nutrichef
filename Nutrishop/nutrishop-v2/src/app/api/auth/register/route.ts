import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getPrisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { handleJsonRoute } from '@/lib/api-handler'
import { registerSchema } from '@/lib/types'

export const POST = handleJsonRoute(async (json, _req: NextRequest) => {
  try {
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

    const hashedPassword = await bcrypt.hash(password, 12)

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
})
