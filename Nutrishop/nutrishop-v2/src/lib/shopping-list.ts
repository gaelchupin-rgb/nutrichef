import { getPrisma } from '@/lib/db'

export async function generateShoppingList(planId: string) {
  const prisma = getPrisma()

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: {
      menuItems: {
        include: {
          recipe: {
            include: {
              ingredients: true,
            },
          },
        },
      },
    },
  })

  if (!plan) throw new Error('Plan not found')

  const aggregated = new Map<
    string,
    { ingredientId: string; quantity: number; unit: string | null }
  >()

  for (const item of plan.menuItems) {
    for (const ri of item.recipe.ingredients) {
      const key = `${ri.ingredientId}:${ri.unit || ''}`
      const existing = aggregated.get(key)
      if (existing) {
        existing.quantity += ri.quantity
      } else {
        aggregated.set(key, {
          ingredientId: ri.ingredientId,
          quantity: ri.quantity,
          unit: ri.unit,
        })
      }
    }
  }

  const list = await prisma.shoppingList.upsert({
    where: { planId },
    update: {
      items: {
        deleteMany: {},
        create: Array.from(aggregated.values()).map((i) => ({
          ingredientId: i.ingredientId,
          quantity: i.quantity,
          unit: i.unit,
        })),
      },
    },
    create: {
      planId,
      items: {
        create: Array.from(aggregated.values()).map((i) => ({
          ingredientId: i.ingredientId,
          quantity: i.quantity,
          unit: i.unit,
        })),
      },
    },
    include: {
      items: { include: { ingredient: true } },
    },
  })

  return list
}

export type GeneratedShoppingList = Awaited<
  ReturnType<typeof generateShoppingList>
>
