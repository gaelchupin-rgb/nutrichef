import { getPrisma } from '@/lib/db'
import { generateMealPlan, GenerationError } from '@/lib/gemini'
import { buildMealPlanPrompt } from '@/lib/prompts'
import { isValidDateRange, hasValidMealDates } from '@/lib/date-utils'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { datesWithinRange, saveMealPlan } from '@/lib/meal-plan'
import { requestSchema } from '@/lib/types'
import { logger } from '@/lib/logger'

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const parsed = requestSchema.safeParse(json)
    if (!parsed.success) {
      return Response.json({ error: 'Entrée invalide' }, { status: 400 })
    }
    const { startDate, endDate } = parsed.data

    if (!isValidDateRange(startDate, endDate)) {
      return Response.json(
        { error: 'Intervalle de dates invalide' },
        { status: 400 },
      )
    }

    const maxRangeDays = 90
    const rangeDays = differenceInCalendarDays(
      parseISO(endDate),
      parseISO(startDate),
    )
    if (rangeDays > maxRangeDays) {
      return Response.json(
        { error: 'Intervalle de dates trop long (maximum 90 jours)' },
        { status: 400 },
      )
    }

    const prisma = getPrisma()
    const profile = await prisma.profile.findFirst({
      include: {
        appliances: {
          include: {
            appliance: true,
          },
        },
      },
    })

    if (!profile) {
      return Response.json({ error: 'Profil introuvable' }, { status: 404 })
    }

    const prompt = buildMealPlanPrompt(
      {
        cuisineType: profile.cuisineType ?? undefined,
        appliances: profile.appliances,
      },
      startDate,
      endDate,
    )

    const mealPlan = await generateMealPlan(prompt)

    if (!hasValidMealDates(mealPlan.days)) {
      return Response.json(
        { error: 'Date de repas invalide' },
        { status: 400 },
      )
    }

    if (!datesWithinRange(mealPlan.days, startDate, endDate)) {
      return Response.json(
        { error: 'Date de repas invalide' },
        { status: 400 },
      )
    }

    const plan = await saveMealPlan(
      mealPlan,
      { cuisineType: profile.cuisineType ?? undefined },
      startDate,
      endDate,
    )

    return Response.json({
      success: true,
      planId: plan.id,
      mealPlan,
    })
  } catch (error) {
    logger.error({ err: error }, 'Erreur lors de la génération du plan repas')
    if (error instanceof GenerationError) {
      const message = error.message || 'Échec de la génération du plan repas'
      return Response.json({ error: message }, { status: 500 })
    }
    return Response.json(
      { error: 'Échec de la génération du plan repas' },
      { status: 500 },
    )
  }
}
