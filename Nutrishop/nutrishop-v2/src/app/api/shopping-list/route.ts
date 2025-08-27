import { NextResponse } from 'next/server'
import { z } from 'zod'
import { handleJsonRoute } from '@/lib/api-handler'
import { generateShoppingList } from '@/lib/shopping-list'

const ingredientSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().nullable().optional(),
})

const recipeIngredientSchema = z.object({
  ingredientId: z.string(),
  ingredient: ingredientSchema,
  quantity: z.number(),
  unit: z.string().nullable(),
})

const requestSchema = z.object({
  plan: z.object({
    menuItems: z.array(
      z.object({
        recipe: z.object({
          ingredients: z.array(recipeIngredientSchema),
        }),
      }),
    ),
  }),
})

export const POST = handleJsonRoute(async (json) => {
  const parsed = requestSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Entrée invalide' }, { status: 400 })
  }

  try {
    const items = generateShoppingList(parsed.data.plan)
    return NextResponse.json({ items })
  } catch (err) {
    return NextResponse.json(
      { error: 'Échec de la génération' },
      { status: 500 },
    )
  }
})
