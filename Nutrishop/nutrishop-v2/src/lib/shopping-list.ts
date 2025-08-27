import { getMealPlan } from '@/lib/meal-plan'
import { randomUUID } from 'crypto'

export interface ShoppingListItemInput {
  ingredientId: string
  name: string
  quantity: number
  unit: string | null
  category?: string | null
}

interface ShoppingList {
  id: string
  planId: string
  items: ShoppingListItemInput[]
}

const shoppingLists: ShoppingList[] = []

export function getShoppingList(planId: string) {
  return shoppingLists.find((l) => l.planId === planId)
}

export async function generateShoppingList(planId: string) {
  const plan = getMealPlan(planId)
  if (!plan) throw new Error('Plan not found')

  const aggregated = new Map<string, ShoppingListItemInput>()

  for (const day of plan.days) {
    for (const meal of day.meals) {
      const ingredients = (meal as any).ingredients as
        | ShoppingListItemInput[]
        | undefined
      if (!ingredients) continue
      for (const ri of ingredients) {
        const key = `${ri.ingredientId}:${ri.unit || ''}`
        const existing = aggregated.get(key)
        if (existing) {
          existing.quantity += ri.quantity
        } else {
          aggregated.set(key, { ...ri })
        }
      }
    }
  }

  const list: ShoppingList = {
    id: randomUUID(),
    planId,
    items: Array.from(aggregated.values()),
  }
  shoppingLists.push(list)
  return list
}

export type GeneratedShoppingList = Awaited<
  ReturnType<typeof generateShoppingList>
>
