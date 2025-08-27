import { GoogleGenerativeAI } from '@google/generative-ai'
import { mealPlanSchema, type MealPlan } from '../meal-plan'
import {
  nutritionSchema,
  type NutritionAnalysis,
  GenerationError,
  NutritionError,
  LLMProvider,
} from './types'
import { parseMealPlanResponse, MAX_RESPONSE_LENGTH } from './utils'

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-pro'

let model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null

export function setModel(
  testModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null,
) {
  model = testModel
}

function getModel() {
  if (!model) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY est requis')
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    model = genAI.getGenerativeModel({ model: GEMINI_MODEL })
  }
  return model
}

export { getModel }

async function generateMealPlan(prompt: string): Promise<MealPlan> {
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
    console.error({ err: error }, 'Erreur lors de la génération du plan repas')
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

async function analyzeNutrition(
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
      throw new Error('Réponse Gemini trop volumineuse')
    }

    let data: unknown
    try {
      data = parseMealPlanResponse(text)
    } catch {
      throw new Error("Format d'analyse nutritionnelle invalide")
    }
    const parsed = nutritionSchema.safeParse(data)
    if (!parsed.success) {
      throw new Error("Format d'analyse nutritionnelle invalide")
    }
    return parsed.data
  } catch (error) {
    console.error({ err: error }, "Erreur lors de l'analyse nutritionnelle")
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

const geminiProvider: LLMProvider = {
  generateMealPlan,
  analyzeNutrition,
}

export default geminiProvider
