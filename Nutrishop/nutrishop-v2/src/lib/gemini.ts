import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'
import extract from 'extract-json-from-string'
import { jsonrepair } from 'jsonrepair'
import { getEnv } from './config'
import { mealPlanSchema, type MealPlan } from './meal-plan'
import { logger } from './logger'

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

let model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null

export const MAX_RESPONSE_LENGTH = 100_000

export function setModel(
  testModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null,
) {
  model = testModel
}

function getModel() {
  if (!model) {
    const { GOOGLE_API_KEY, GEMINI_MODEL } = getEnv()
    if (!GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY is required')
    if (!GEMINI_MODEL) throw new Error('GEMINI_MODEL is required')
    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY)
    model = genAI.getGenerativeModel({ model: GEMINI_MODEL })
  }
  return model
}

export { getModel }

export function parseMealPlanResponse(text: string) {
  const cleaned = text.replace(/```(?:json)?|```/gi, '').trim()

  const extracted = extract(cleaned)
  if (Array.isArray(extracted)) {
    for (const item of extracted) {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        return item
      }
    }
  }

  const startObj = cleaned.indexOf('{')
  const endObj = cleaned.lastIndexOf('}')
  if (startObj !== -1 && endObj !== -1) {
    try {
      const obj = JSON.parse(jsonrepair(cleaned.slice(startObj, endObj + 1)))
      if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
        return obj
      }
    } catch {}
  }

  throw new Error('Invalid meal plan format')
}

export async function generateMealPlan(prompt: string): Promise<MealPlan> {
  try {
    const result = await getModel().generateContent(prompt)
    const response = await result.response
    const text = response.text()
    if (text.length > MAX_RESPONSE_LENGTH) {
      throw new Error('Gemini response too large')
    }
    const data = parseMealPlanResponse(text)
    const parsed = mealPlanSchema.safeParse(data)
    if (!parsed.success) {
      throw new Error('Invalid meal plan format')
    }
    return parsed.data
  } catch (error) {
    logger.error({ err: error }, 'Error generating meal plan')
    if (
      error instanceof Error &&
      (error.message === 'Invalid meal plan format' ||
        error.message === 'Gemini response too large')
    ) {
      throw new GenerationError(error.message, { cause: error })
    }
    throw new GenerationError('Failed to generate meal plan', { cause: error })
  }
}

const nutritionSchema = z.object({
  kcal: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number(),
  sugar: z.number(),
  sodium: z.number(),
})

export type NutritionAnalysis = z.infer<typeof nutritionSchema>

export async function analyzeNutrition(
  foodDescription: string,
): Promise<NutritionAnalysis> {
  const prompt =
    `Analyse la valeur nutritionnelle de ce plat: "${foodDescription}". ` +
    `Réponds au format JSON avec les champs: kcal, protein (g), carbs (g), fat (g), fiber (g), sugar (g), sodium (mg).`

  try {
    const result = await getModel().generateContent(prompt)
    const response = await result.response
    const text = response.text()
    if (text.length > MAX_RESPONSE_LENGTH) {
      throw new Error('Gemini response too large')
    }

    let data: unknown
    try {
      data = parseMealPlanResponse(text)
    } catch {
      throw new Error('Invalid nutrition analysis format')
    }
    const parsed = nutritionSchema.safeParse(data)
    if (!parsed.success) {
      throw new Error('Invalid nutrition analysis format')
    }
    return parsed.data
  } catch (error) {
    logger.error({ err: error }, 'Error analyzing nutrition')
    if (
      error instanceof Error &&
      (error.message === 'Invalid nutrition analysis format' ||
        error.message === 'Gemini response too large')
    ) {
      throw new NutritionError(error.message, { cause: error })
    }
    throw new NutritionError('Failed to analyze nutrition', { cause: error })
  }
}
