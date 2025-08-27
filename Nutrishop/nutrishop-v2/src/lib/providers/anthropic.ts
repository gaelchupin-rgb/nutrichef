import Anthropic from '@anthropic-ai/sdk'
import { mealPlanSchema, type MealPlan } from '../meal-plan'
import {
  nutritionSchema,
  type NutritionAnalysis,
  GenerationError,
  NutritionError,
  LLMProvider,
} from './types'
import { parseMealPlanResponse, MAX_RESPONSE_LENGTH } from './utils'

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-3-haiku-20240307'

let client: Anthropic | null = null

function getClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY est requis')
    client = new Anthropic({ apiKey })
  }
  return client
}

async function generateMealPlan(prompt: string): Promise<MealPlan> {
  try {
    const response = await getClient().messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = response.content
      .map((part) => ('text' in part ? part.text : ''))
      .join('')
    if (text.length > MAX_RESPONSE_LENGTH) {
      throw new Error('Réponse Anthropic trop volumineuse')
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
    const response = await getClient().messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = response.content
      .map((part) => ('text' in part ? part.text : ''))
      .join('')
    if (text.length > MAX_RESPONSE_LENGTH) {
      throw new Error('Réponse Anthropic trop volumineuse')
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

const anthropicProvider: LLMProvider = {
  generateMealPlan,
  analyzeNutrition,
}

export default anthropicProvider
