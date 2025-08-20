interface Profile {
  cuisineType?: string
  appliances?: { appliance: { name: string } }[]
}

export function buildMealPlanPrompt(
  profile: Profile,
  startDate: string,
  endDate: string
) {
  const applianceList =
    profile.appliances?.map((a) => a.appliance.name).join(', ') || 'none'

  const example = `
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "meals": [
        {
          "type": "",
          "name": "",
          "description": "",
          "instructions": [""],
          "prepTime": 0,
          "cookTime": 0,
          "servings": 0,
          "difficulty": "",
          "nutrition": {
            "kcal": 0,
            "protein": 0,
            "carbs": 0,
            "fat": 0,
            "fiber": 0,
            "sugar": 0,
            "sodium": 0
          }
        }
      ]
    }
  ]
}`.trim()

  return `Tu es un planificateur de repas. Crée un plan de repas du ${startDate} au ${endDate}.
Cuisine préférée: ${profile.cuisineType || 'classique'}.
Appareils disponibles: ${applianceList}.
Réponds en JSON avec le format ${example}`
}
