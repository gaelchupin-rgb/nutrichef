import { NextResponse } from 'next/server'
import { z } from 'zod'
import { handleJsonRoute } from '@/lib/api-handler'
import { generateShoppingList } from '@/lib/shopping-list'

const requestSchema = z.object({
  planId: z.string(),
})

export const POST = handleJsonRoute(async (json) => {
  const userId = ''

  const parsed = requestSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Entrée invalide' }, { status: 400 })
  }

  try {
    const list = await generateShoppingList(parsed.data.planId, userId)
    const items = list.items.map((i) => ({
      id: i.ingredientId,
      name: i.ingredient.name,
      quantity: i.quantity,
      unit: i.unit,
      category: i.ingredient.category,
    }))
    return NextResponse.json({ items })
  } catch (err) {
    return NextResponse.json(
      { error: 'Échec de la génération' },
      { status: 500 },
    )
  }
})
