import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateMealPlan } from '@/lib/gemini'
import { buildMealPlanPrompt } from '@/lib/prompts'
import { z } from 'zod'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const schema = z.object({
      startDate: z.string().refine((d) => !isNaN(Date.parse(d)), {
        message: 'Invalid startDate'
      }),
      endDate: z.string().refine((d) => !isNaN(Date.parse(d)), {
        message: 'Invalid endDate'
      })
    })
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    const { startDate, endDate } = parsed.data
    
    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      include: {
        appliances: {
          include: {
            appliance: true
          }
        }
      }
    })
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Build prompt
    const prompt = buildMealPlanPrompt(profile, startDate, endDate)
    
    // Generate meal plan
    const mealPlan = await generateMealPlan(prompt)
    if (!mealPlan || !Array.isArray(mealPlan.days)) {
      return NextResponse.json(
        { error: 'Invalid meal plan format' },
        { status: 500 }
      )
    }
    // Save plan and menu items atomically
    const plan = await prisma.$transaction(async (tx) => {
      const plan = await tx.plan.create({
        data: {
          userId: session.user.id,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        }
      })

      await Promise.all(
        mealPlan.days.map((day: any) =>
          Promise.all(
            day.meals.map(async (meal: any) => {
              let recipe = await tx.recipe.findFirst({
                where: { name: meal.name }
              })
              if (!recipe) {
                recipe = await tx.recipe.create({
                  data: {
                    name: meal.name,
                    description: meal.description,
                    instructions: meal.instructions.join('\n'),
                    prepTime: meal.prepTime,
                    cookTime: meal.cookTime,
                    servings: meal.servings,
                    difficulty: meal.difficulty,
                    kcal: meal.nutrition.kcal,
                    protein: meal.nutrition.protein,
                    carbs: meal.nutrition.carbs,
                    fat: meal.nutrition.fat,
                    fiber: meal.nutrition.fiber,
                    sugar: meal.nutrition.sugar,
                    sodium: meal.nutrition.sodium,
                    tags: [profile.cuisineType || 'classique'],
                    category: meal.type,
                  }
                })
              }
              await tx.menuItem.create({
                data: {
                  planId: plan.id,
                  date: new Date(day.date),
                  mealType: meal.type,
                  recipeId: recipe.id,
                }
              })
            })
          )
        )
      )
      return plan
    })

    return NextResponse.json({
      success: true,
      planId: plan.id,
      mealPlan
    })
  } catch (error) {
    console.error('Error generating meal plan:', error)
    if (error instanceof Error && error.message === 'Invalid meal plan format') {
      return NextResponse.json(
        { error: 'Invalid meal plan format' },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to generate meal plan' },
      { status: 500 }
    )
  }
}