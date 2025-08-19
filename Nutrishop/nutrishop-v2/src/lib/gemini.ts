import { GoogleGenerativeAI } from '@google/generative-ai'

let model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null

export function setModel(testModel: any) {
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
  const match = text.match(/(\{[\s\S]*?\}|\[[\s\S]*?\])/)
  if (!match) {
    throw new Error('Invalid meal plan format')
  }
  try {
    return JSON.parse(match[0])
  } catch {
    throw new Error('Invalid meal plan format')
  }
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

export async function analyzeNutrition(foodDescription: string) {
  const prompt =
    `Analyse la valeur nutritionnelle de ce plat: "${foodDescription}". ` +
    `Réponds au format JSON avec les champs: kcal, protein (g), carbs (g), fat (g), fiber (g), sugar (g), sodium (mg).`

  try {
    const result = await getModel().generateContent(prompt)
    const response = await result.response
    const text = response.text()

    try {
      return parseMealPlanResponse(text)
    } catch {
      throw new Error('Invalid nutrition analysis format')
    }
  } catch (error) {
    console.error('Error analyzing nutrition:', error)
    throw new Error('Failed to analyze nutrition')
  }
}
