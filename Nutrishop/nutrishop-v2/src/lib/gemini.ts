import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GOOGLE_API_KEY
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null
const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

export const model = genAI ? genAI.getGenerativeModel({ model: modelName }) : null

export function parseMealPlanResponse(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Invalid meal plan format')
  }
}

export async function generateMealPlan(prompt: string) {
  try {
    if (!model) throw new Error('GOOGLE_API_KEY is required')
    const result = await model.generateContent(prompt)
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
  const prompt = `Analyse la valeur nutritionnelle de ce plat: "${foodDescription}". 
  Réponds au format JSON avec les champs: kcal, protein (g), carbs (g), fat (g), fiber (g), sugar (g), sodium (mg).`
  
  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    try {
      return JSON.parse(text)
    } catch {
      throw new Error('Invalid nutrition analysis format')
    }
  } catch (error) {
    console.error('Error analyzing nutrition:', error)
    throw new Error('Failed to analyze nutrition')
  }
}