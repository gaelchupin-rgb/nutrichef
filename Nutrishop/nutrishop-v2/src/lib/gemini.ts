import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'
import extract from 'extract-json-from-string'
import { jsonrepair } from 'jsonrepair'

let model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null

export function setModel(
  testModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null
) {
  model = testModel
}

function getModel() {
  if (!model) {
    const apiKey = process.env.GOOGLE_API_KEY
    const modelName = process.env.GEMINI_MODEL
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is required')
    }
    if (!modelName) {
      throw new Error('GEMINI_MODEL is required')
    }
    const genAI = new GoogleGenerativeAI(apiKey)
    model = genAI.getGenerativeModel({ model: modelName })
  }
  return model
}

export { getModel }

export function parseMealPlanResponse(text: string) {
  const cleaned = text.replace(/```(?:json)?|```/gi, '').trim()

  const extracted = extract(cleaned)
  if (Array.isArray(extracted) && extracted.length > 0) {
    return extracted[0]
  }

  const startObj = cleaned.indexOf('{')
  const endObj = cleaned.lastIndexOf('}')
  if (startObj !== -1 && endObj !== -1) {
    try {
      return JSON.parse(jsonrepair(cleaned.slice(startObj, endObj + 1)))
    } catch {}
  }
  const startArr = cleaned.indexOf('[')
  const endArr = cleaned.lastIndexOf(']')
  if (startArr !== -1 && endArr !== -1) {
    try {
      return JSON.parse(jsonrepair(cleaned.slice(startArr, endArr + 1)))
    } catch {}
  }

  throw new Error('Invalid meal plan format')
}

export async function generateMealPlan(prompt: string) {
  try {
    const result = await getModel().generateContent(prompt)
    const response = await result.response
    const text = response.text()
    return parseMealPlanResponse(text)
  } catch (error) {
    console.error('Error generating meal plan:', error)
    if (error instanceof Error && error.message === 'Invalid meal plan format') {
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
    if (error instanceof Error && error.message === 'Invalid nutrition analysis format') {
      throw error
    }
    throw new Error('Failed to analyze nutrition')
  }
}
