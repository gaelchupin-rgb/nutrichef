import { NextRequest, NextResponse } from 'next/server'
import { generateMealPlan, GenerationError } from '@/lib/gemini'
import { buildMealPlanPrompt, profile } from '@/lib/prompts'
import { isValidDateRange, hasValidMealDates } from '@/lib/date-utils'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { datesWithinRange, saveMealPlan } from '@/lib/meal-plan'
import { handleJsonRoute } from '@/lib/api-handler'
import { requestSchema } from '@/lib/types'

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

    const prompt = buildMealPlanPrompt(profile, startDate, endDate)

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
      { cuisineType: profile.cuisine },
      startDate,
      endDate,
    )

    return NextResponse.json({
      success: true,
      planId: plan.id,
      mealPlan,
    })
  } catch (error) {
    console.error({ err: error }, 'Erreur lors de la génération du plan repas')
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
