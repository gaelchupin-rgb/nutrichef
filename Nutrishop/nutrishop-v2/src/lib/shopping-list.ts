export interface ShoppingListItem {
  id: string
  name: string
  quantity: number
  unit: string | null
  category?: string | null
}

interface ShoppingListPlan {
  menuItems: Array<{
    recipe: {
      ingredients: Array<{
        ingredientId: string
        ingredient: { name: string; category?: string | null }
        quantity: number
        unit: string | null
      }>
    }
  }>
}

export function generateShoppingList(
  plan: ShoppingListPlan,
): ShoppingListItem[] {
  const aggregated = new Map<string, ShoppingListItem>()

  for (const item of plan.menuItems) {
    for (const ri of item.recipe.ingredients) {
      const key = `${ri.ingredientId}:${ri.unit || ''}`
      const existing = aggregated.get(key)
      if (existing) {
        existing.quantity += ri.quantity
      } else {
        aggregated.set(key, {
          id: ri.ingredientId,
          name: ri.ingredient.name,
          quantity: ri.quantity,
          unit: ri.unit,
          category: ri.ingredient.category,
        })
      }
    }
  }

  return Array.from(aggregated.values())
}
