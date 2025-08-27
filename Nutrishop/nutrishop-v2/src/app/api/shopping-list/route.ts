import { z } from 'zod'
import { generateShoppingList } from '@/lib/shopping-list'

const requestSchema = z.object({
  planId: z.string(),
})

export async function POST(req: Request) {
  const json = await req.json()
  const parsed = requestSchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: 'Entrée invalide' }, { status: 400 })
  }

  try {
    const list = await generateShoppingList(parsed.data.planId)
    const items = list.items.map((i) => ({
      id: i.ingredientId,
      name: i.ingredient.name,
      quantity: i.quantity,
      unit: i.unit,
      category: i.ingredient.category,
    }))
    return Response.json({ items })
  } catch (err) {
    return Response.json(
      { error: 'Échec de la génération' },
      { status: 500 },
    )
  }
}
