import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export interface MealPlanProfile {
  cuisineType?: string
}

export const sessionFetcher = { get: getServerSession }

export const mealPlanSchema = z.object({
  days: z.array(
    z.object({
      date: z.string(),
      meals: z.array(
        z.object({
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
            sodium: z.coerce.number(),
          }),
        })
      ),
    })
  ),
})

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
  profile: MealPlanProfile,
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

    for (const day of validMealPlan.days) {
      for (const meal of day.meals) {
        const recipe = await tx.recipe.upsert({
          where: { userId_name: { userId, name: meal.name } },
          update: {},
          create: {
            userId,
            name: meal.name,
            description: meal.description,
            instructions: Array.isArray(meal.instructions)
              ? meal.instructions.join('\n')
              : '',
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

        await tx.menuItem.create({
          data: {
            planId: plan.id,
            date: new Date(day.date),
            mealType: meal.type,
            recipeId: recipe.id,
          },
        })
      }
    }

    return plan
  })
}

