import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6)
})

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const parsed = registerSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ message: 'Données d\'inscription invalides' }, { status: 400 })
    }

    const { email, username, password } = parsed.data

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'Un utilisateur avec cet email ou ce nom d\'utilisateur existe déjà' },
        { status: 400 }
      )
    }

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
      if (error instanceof Error && (error as any).code === 'P2002') {
        return NextResponse.json(
          { message: 'Un utilisateur avec cet email ou ce nom d\'utilisateur existe déjà' },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json(
      { message: 'Utilisateur créé avec succès' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { message: 'Une erreur est survenue lors de l\'inscription' },
      { status: 500 }
    )
  }
}