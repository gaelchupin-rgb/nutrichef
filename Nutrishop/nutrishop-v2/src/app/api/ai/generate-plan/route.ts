import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateMealPlan } from '@/lib/gemini'
import { buildMealPlanPrompt } from '@/lib/prompts'
import { isValidDateRange, hasValidMealDates } from '@/lib/date-utils'
import { z } from 'zod'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id: string } | undefined)?.id

    if (!session || !userId) {
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

    if (!isValidDateRange(startDate, endDate)) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
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
    const prompt = buildMealPlanPrompt({ ...profile, cuisineType: profile.cuisineType ?? undefined }, startDate, endDate)
    
    // Generate meal plan
    const mealPlan = await generateMealPlan(prompt)
    const mealPlanSchema = z.object({
      days: z.array(z.object({
        date: z.string(),
        meals: z.array(z.object({
          name: z.string(),
          description: z.string().optional(),
          instructions: z.array(z.string()),
          prepTime: z.number().optional(),
          cookTime: z.number().optional(),
          servings: z.number().optional(),
          difficulty: z.string().optional(),
          type: z.string(),
          nutrition: z.object({
            kcal: z.number(),
            protein: z.number(),
            carbs: z.number(),
            fat: z.number(),
            fiber: z.number(),
            sugar: z.number(),
            sodium: z.number()
          })
        }))
      }))
    })
    const parsedPlan = mealPlanSchema.safeParse(mealPlan)
    if (!parsedPlan.success) {
      return NextResponse.json(
        { error: 'Invalid meal plan format' },
        { status: 500 }
      )
    }
    const validMealPlan = parsedPlan.data

    if (!hasValidMealDates(validMealPlan.days)) {
      return NextResponse.json({ error: 'Invalid meal date' }, { status: 400 })
    }

    // Save plan and menu items atomically
    const plan = await prisma.$transaction(async (tx) => {
      const plan = await tx.plan.create({
        data: {
          userId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        }
      })

      await Promise.all(
        validMealPlan.days.map((day) =>
          Promise.all(
            day.meals.map(async (meal) => {
              let recipe = await tx.recipe.findFirst({
                where: { name: meal.name }
              })
              if (!recipe) {
                recipe = await tx.recipe.create({
                  data: {
                    name: meal.name,
                    description: meal.description,
                    instructions: Array.isArray(meal.instructions) ? meal.instructions.join('\n') : '',
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
      mealPlan: validMealPlan
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