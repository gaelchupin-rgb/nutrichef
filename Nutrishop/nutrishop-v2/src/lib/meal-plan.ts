import { getPrisma } from '@/lib/db'
import { z } from 'zod'
import { isValidDate } from '@/lib/date-utils'
import { parseISO } from 'date-fns'

export interface MealPlanProfile {
  cuisineType?: string
}

export const mealTypes = ['breakfast', 'lunch', 'dinner'] as const

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
          type: z.enum(mealTypes),
          nutrition: z.object({
            kcal: z.coerce.number(),
            protein: z.coerce.number(),
            carbs: z.coerce.number(),
            fat: z.coerce.number(),
            fiber: z.coerce.number(),
            sugar: z.coerce.number(),
            sodium: z.coerce.number(),
          }),
        }),
      ),
    }),
  ),
})

export type MealPlan = z.infer<typeof mealPlanSchema>

export function datesWithinRange(
  days: Array<{ date: string }>,
  startDate: string,
  endDate: string,
) {
  if (!isValidDate(startDate) || !isValidDate(endDate)) return false
  const start = parseISO(startDate).getTime()
  const end = parseISO(endDate).getTime()
  if (start > end) return false
  return days.every((day) => {
    if (!isValidDate(day.date)) return false
    const time = parseISO(day.date).getTime()
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
        type: (typeof mealTypes)[number]
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
  endDate: string,
) {
  if (!datesWithinRange(validMealPlan.days, startDate, endDate)) {
    throw new Error('Meal plan dates out of range')
  }
  const prisma = getPrisma()
  return prisma.$transaction(async (tx) => {
    const plan = await tx.plan.create({
      data: {
        userId,
        startDate: parseISO(startDate),
        endDate: parseISO(endDate),
      },
    })

    for (const day of validMealPlan.days) {
      for (const meal of day.meals) {
        const recipeData = {
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

        const recipe = await tx.recipe.upsert({
          where: { userId_name: { userId, name: meal.name } },
          update: recipeData,
          create: { userId, name: meal.name, ...recipeData },
        })

        await tx.menuItem.create({
          data: {
            planId: plan.id,
            date: parseISO(day.date),
            mealType: meal.type,
            recipeId: recipe.id,
          },
        })
      }
    }

    return plan
  })
}
