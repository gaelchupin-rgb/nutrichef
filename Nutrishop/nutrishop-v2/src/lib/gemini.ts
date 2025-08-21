import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'
import extract from 'extract-json-from-string'
import { jsonrepair } from 'jsonrepair'
import { getGeminiConfig } from './config'

let model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null

export const MAX_RESPONSE_LENGTH = 100_000

export function setModel(
  testModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null
) {
  model = testModel
}

function getModel() {
  if (!model) {
    const { apiKey, model: modelName } = getGeminiConfig()
    const genAI = new GoogleGenerativeAI(apiKey)
    model = genAI.getGenerativeModel({ model: modelName })
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

export async function generateMealPlan(prompt: string) {
  try {
    const result = await getModel().generateContent(prompt)
    const response = await result.response
    const text = response.text()
    if (text.length > MAX_RESPONSE_LENGTH) {
      throw new Error('Gemini response too large')
    }
    return parseMealPlanResponse(text)
  } catch (error) {
    console.error('Error generating meal plan:', error)
    if (
      error instanceof Error &&
      (error.message === 'Invalid meal plan format' ||
        error.message === 'Gemini response too large')
    ) {
      throw error
    }
    throw new Error('Failed to generate meal plan')
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

export async function analyzeNutrition(foodDescription: string) {
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
    console.error('Error analyzing nutrition:', error)
    if (
      error instanceof Error &&
      (error.message === 'Invalid nutrition analysis format' ||
        error.message === 'Gemini response too large')
    ) {
      throw error
    }
    throw new Error('Failed to analyze nutrition')
  }
}
