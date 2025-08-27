import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'
import extract from 'extract-json-from-string'
import { jsonrepair } from 'jsonrepair'
import { mealPlanSchema, type MealPlan } from './meal-plan'

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

const GEMINI_MODEL = 'gemini-1.5-flash'

let model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null

export const MAX_RESPONSE_LENGTH = 100_000

function getModel() {
  if (!model) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY est requis')
    const genAI = new GoogleGenerativeAI(apiKey)
    model = genAI.getGenerativeModel({ model: GEMINI_MODEL })
  }
  return model
}

function parseResponse(text: string) {
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

export async function generateMealPlan(
  prompt: string,
  customModel?: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
): Promise<MealPlan> {
  const m = customModel ?? getModel()
  try {
    const result = await m.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    if (text.length > MAX_RESPONSE_LENGTH) {
      throw new Error('Réponse Gemini trop volumineuse')
    }
    const data = parseResponse(text)
    const parsed = mealPlanSchema.safeParse(data)
    if (!parsed.success) {
      throw new Error('Format du plan repas invalide')
    }
    return parsed.data
  } catch (error) {
    console.error(error)
    if (
      error instanceof Error &&
      (error.message === 'Format du plan repas invalide' ||
        error.message === 'Réponse Gemini trop volumineuse')
    ) {
      throw new GenerationError(error.message, { cause: error })
    }
    throw new GenerationError('Échec de la génération du plan repas', {
      cause: error,
    })
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
  customModel?: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
): Promise<NutritionAnalysis> {
  const prompt =
    `Analyse la valeur nutritionnelle de ce plat: "${foodDescription}". ` +
    `Réponds au format JSON avec les champs: kcal, protein (g), carbs (g), fat (g), fiber (g), sugar (g), sodium (mg).`

  try {
    const m = customModel ?? getModel()
    const result = await m.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    if (text.length > MAX_RESPONSE_LENGTH) {
      throw new Error('Réponse Gemini trop volumineuse')
    }

    let data: unknown
    try {
      data = parseResponse(text)
    } catch {
      throw new Error("Format d'analyse nutritionnelle invalide")
    }
    const parsed = nutritionSchema.safeParse(data)
    if (!parsed.success) {
      throw new Error("Format d'analyse nutritionnelle invalide")
    }
    return parsed.data
  } catch (error) {
    console.error(error)
    if (
      error instanceof Error &&
      (error.message === "Format d'analyse nutritionnelle invalide" ||
        error.message === 'Réponse Gemini trop volumineuse')
    ) {
      throw new NutritionError(error.message, { cause: error })
    }
    throw new NutritionError("Échec de l'analyse nutritionnelle", {
      cause: error,
    })
  }
}
