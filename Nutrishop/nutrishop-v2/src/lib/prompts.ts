interface Profile {
  cuisine?: string
  appliances?: string[]
}

export const profile: Profile = {
  cuisine: 'classique',
  appliances: [],
}

import { mealPlanSchema, mealTypes } from './meal-plan'

export function buildMealPlanPrompt(
  profile: Profile,
  startDate: string,
  endDate: string,
) {
  const applianceList = profile.appliances?.join(', ') || 'none'

  const exampleObj = mealPlanSchema.parse({
    days: [
      {
        date: 'YYYY-MM-DD',
        meals: [
          {
            type: mealTypes[0],
            name: '',
            description: '',
            instructions: [''],
            prepTime: 0,
            cookTime: 0,
            servings: 0,
            difficulty: '',
            nutrition: {
              kcal: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              fiber: 0,
              sugar: 0,
              sodium: 0,
            },
          },
        ],
      },
    ],
  })

  const example = JSON.stringify(exampleObj, null, 2)

  return `Tu es un planificateur de repas. Crée un plan de repas du ${startDate} au ${endDate}.
Cuisine préférée: ${profile.cuisine || 'classique'}.
Appareils disponibles: ${applianceList}.
Réponds en JSON avec le format ${example}`
}
