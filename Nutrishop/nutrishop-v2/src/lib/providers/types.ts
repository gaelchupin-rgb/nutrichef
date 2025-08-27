import { z } from 'zod'
import type { MealPlan } from '../meal-plan'

export const nutritionSchema = z.object({
  kcal: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number(),
  sugar: z.number(),
  sodium: z.number(),
})

export type NutritionAnalysis = z.infer<typeof nutritionSchema>

export class GenerationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'GenerationError'
  }
}

export class NutritionError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'NutritionError'
  }
}

export interface LLMProvider {
  generateMealPlan(prompt: string): Promise<MealPlan>
  analyzeNutrition(foodDescription: string): Promise<NutritionAnalysis>
}
