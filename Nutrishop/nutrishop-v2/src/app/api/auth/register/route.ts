import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { email, username, password, firstName, lastName } = await request.json()

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