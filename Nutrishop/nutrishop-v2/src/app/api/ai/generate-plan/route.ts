import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateMealPlan } from '@/lib/gemini'
import { buildMealPlanPrompt } from '@/lib/prompts'
import { isValidDateRange, hasValidMealDates } from '@/lib/date-utils'
import { z } from 'zod'

export const sessionFetcher = { get: getServerSession }

export const mealPlanSchema = z.object({
  days: z.array(z.object({
    date: z.string(),
    meals: z.array(z.object({
      name: z.string(),
      description: z.string().optional(),
      instructions: z.array(z.string()),
      prepTime: z.coerce.number().optional(),
      cookTime: z.coerce.number().optional(),
      servings: z.coerce.number().optional(),
      difficulty: z.string().optional(),
      type: z.string(),
      nutrition: z.object({
        kcal: z.coerce.number(),
        protein: z.coerce.number(),
        carbs: z.coerce.number(),
        fat: z.coerce.number(),
        fiber: z.coerce.number(),
        sugar: z.coerce.number(),
        sodium: z.coerce.number()
      })
    }))
  }))
})

export async function POST(req: NextRequest) {
  try {
    const session = await sessionFetcher.get(authOptions)
    const userId = (session?.user as { id: string } | undefined)?.id

    if (!session || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
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

    if (!datesWithinRange(validMealPlan.days, startDate, endDate)) {
      return NextResponse.json({ error: 'Invalid meal date' }, { status: 400 })
    }

    const plan = await saveMealPlan(validMealPlan, profile, userId, startDate, endDate)

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

export function datesWithinRange(
  days: Array<{ date: string }>,
  startDate: string,
  endDate: string
) {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  return days.every((day) => {
    const time = new Date(day.date).getTime()
    return time >= start && time <= end
  })
}

export async function saveMealPlan(
  validMealPlan: {
    days: Array<{
      date: string
      meals: Array<{
        name: string
        description?: string
        instructions: string[]
        prepTime?: number
        cookTime?: number
        servings?: number
        difficulty?: string
        type: string
        nutrition: {
          kcal: number
          protein: number
          carbs: number
          fat: number
          fiber: number
          sugar: number
          sodium: number
        }
      }>
    }>
  },
  profile: any,
  userId: string,
  startDate: string,
  endDate: string
) {
  return prisma.$transaction(async (tx) => {
    const plan = await tx.plan.create({
      data: {
        userId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    })

    const tasks: Promise<unknown>[] = []
    for (const day of validMealPlan.days) {
      for (const meal of day.meals) {
        const task = tx.recipe
          .upsert({
            where: { userId_name: { userId, name: meal.name } },
            update: {},
            create: {
              userId,
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
            },
          })
          .then((recipe) =>
            tx.menuItem.create({
              data: {
                planId: plan.id,
                date: new Date(day.date),
                mealType: meal.type,
                recipeId: recipe.id,
              },
            })
          )
        tasks.push(task)
      }
    }
    await Promise.all(tasks)
    return plan
  })
}