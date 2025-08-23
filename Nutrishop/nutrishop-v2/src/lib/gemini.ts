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
  testModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null
) {
  model = testModel
}

function getModel() {
  if (!model) {
    const { GOOGLE_API_KEY, GEMINI_MODEL } = getEnv()
    if (!GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY est requis')
    if (!GEMINI_MODEL) throw new Error('GEMINI_MODEL est requis')
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

  throw new Error('Format du plan repas invalide')
}

export async function generateMealPlan(prompt: string): Promise<MealPlan> {
  try {
    const result = await getModel().generateContent(prompt)
    const response = await result.response
    const text = response.text()
    if (text.length > MAX_RESPONSE_LENGTH) {
      throw new Error('Réponse Gemini trop volumineuse')
    }
    const data = parseMealPlanResponse(text)
    const parsed = mealPlanSchema.safeParse(data)
    if (!parsed.success) {
      throw new Error('Format du plan repas invalide')
    }
    return parsed.data
  } catch (error) {
    logger.error({ err: error }, 'Erreur lors de la génération du plan repas')
    if (
      error instanceof Error &&
      (error.message === 'Format du plan repas invalide' ||
        error.message === 'Réponse Gemini trop volumineuse')
    ) {
      throw new GenerationError(error.message, { cause: error })
    }
    throw new GenerationError('Échec de la génération du plan repas', { cause: error })
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

export async function analyzeNutrition(foodDescription: string): Promise<NutritionAnalysis> {
  const prompt =
    `Analyse la valeur nutritionnelle de ce plat: "${foodDescription}". ` +
    `Réponds au format JSON avec les champs: kcal, protein (g), carbs (g), fat (g), fiber (g), sugar (g), sodium (mg).`

  try {
    const result = await getModel().generateContent(prompt)
    const response = await result.response
    const text = response.text()
    if (text.length > MAX_RESPONSE_LENGTH) {
      throw new Error('Réponse Gemini trop volumineuse')
    }

    let data: unknown
    try {
      data = parseMealPlanResponse(text)
    } catch {
      throw new Error("Format de l'analyse nutritionnelle invalide")
    }
    const parsed = nutritionSchema.safeParse(data)
    if (!parsed.success) {
      throw new Error("Format de l'analyse nutritionnelle invalide")
    }
    return parsed.data
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de l'analyse nutritionnelle")
    if (
      error instanceof Error &&
      (error.message === "Format de l'analyse nutritionnelle invalide" ||
        error.message === 'Réponse Gemini trop volumineuse')
    ) {
      throw new NutritionError(error.message, { cause: error })
    }
    throw new NutritionError("Échec de l'analyse nutritionnelle", { cause: error })
  }
}
