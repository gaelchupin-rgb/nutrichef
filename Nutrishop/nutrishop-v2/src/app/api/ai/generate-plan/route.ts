import { NextRequest, NextResponse } from 'next/server'
import { generateMealPlan, GenerationError } from '@/lib/gemini'
import { buildMealPlanPrompt } from '@/lib/prompts'
import { isValidDateRange, hasValidMealDates } from '@/lib/date-utils'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { datesWithinRange, saveMealPlan } from '@/lib/meal-plan'
import { handleJsonRoute } from '@/lib/api-handler'
import { requestSchema } from '@/lib/types'
import { logger } from '@/lib/logger'

export const POST = handleJsonRoute(async (json, req: NextRequest) => {
  try {
    const parsed = requestSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Entrée invalide' }, { status: 400 })
    }
    const { startDate, endDate } = parsed.data

    if (!isValidDateRange(startDate, endDate)) {
      return NextResponse.json(
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
      return NextResponse.json(
        { error: 'Intervalle de dates trop long (maximum 90 jours)' },
        { status: 400 },
      )
    }

    const profile = { cuisineType: undefined, appliances: [] as any[] }

    const prompt = buildMealPlanPrompt(
      { cuisineType: profile.cuisineType ?? undefined, appliances: profile.appliances },
      startDate,
      endDate,
    )

    const mealPlan = await generateMealPlan(prompt)

    if (!hasValidMealDates(mealPlan.days)) {
      return NextResponse.json(
        { error: 'Date de repas invalide' },
        { status: 400 },
      )
    }

    if (!datesWithinRange(mealPlan.days, startDate, endDate)) {
      return NextResponse.json(
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

    return NextResponse.json({
      success: true,
      planId: plan.id,
      mealPlan,
    })
  } catch (error) {
    logger.error({ err: error }, 'Erreur lors de la génération du plan repas')
    if (error instanceof GenerationError) {
      const message = error.message || 'Échec de la génération du plan repas'
      return NextResponse.json({ error: message }, { status: 500 })
    }
    return NextResponse.json(
      { error: 'Échec de la génération du plan repas' },
      { status: 500 },
    )
  }
})
