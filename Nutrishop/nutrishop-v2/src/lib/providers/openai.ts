import OpenAI from 'openai'
import { mealPlanSchema, type MealPlan } from '../meal-plan'
import {
  nutritionSchema,
  type NutritionAnalysis,
  GenerationError,
  NutritionError,
  LLMProvider,
} from './types'
import { parseMealPlanResponse, MAX_RESPONSE_LENGTH } from './utils'

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

let client: OpenAI | null = null

function getClient() {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY est requis')
    client = new OpenAI({ apiKey })
  }
  return client
}

async function generateMealPlan(prompt: string): Promise<MealPlan> {
  try {
    const completion = await getClient().chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = completion.choices[0].message?.content ?? ''
    if (text.length > MAX_RESPONSE_LENGTH) {
      throw new Error('Réponse OpenAI trop volumineuse')
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
        error.message.includes('trop volumineuse'))
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
    const completion = await getClient().chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = completion.choices[0].message?.content ?? ''
    if (text.length > MAX_RESPONSE_LENGTH) {
      throw new Error('Réponse OpenAI trop volumineuse')
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
        error.message.includes('trop volumineuse'))
    ) {
      throw new NutritionError(error.message, { cause: error })
    }
    throw new NutritionError("Échec de l'analyse nutritionnelle", {
      cause: error,
    })
  }
}

const openaiProvider: LLMProvider = {
  generateMealPlan,
  analyzeNutrition,
}

export default openaiProvider
