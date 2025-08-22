import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { getPrisma } from '@/lib/db'
import { generateMealPlan } from '@/lib/gemini'
import { buildMealPlanPrompt } from '@/lib/prompts'
import { isValidDateRange, hasValidMealDates } from '@/lib/date-utils'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { datesWithinRange, saveMealPlan } from '@/lib/meal-plan'
import { getSession } from '@/lib/session'
import { handleJsonRoute } from '@/lib/api-handler'
import { requestSchema } from '@/lib/types'

export const POST = handleJsonRoute(async (json, req: NextRequest) => {
  try {
    const session = await getSession(authOptions)
    const userId = session?.user.id

    if (!session || !userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const parsed = requestSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Entrée invalide' }, { status: 400 })
    }
    const { startDate, endDate } = parsed.data

    if (!isValidDateRange(startDate, endDate)) {
      return NextResponse.json({ error: 'Intervalle de dates invalide' }, { status: 400 })
    }

    const maxRangeDays = 90
    const rangeDays = differenceInCalendarDays(
      parseISO(endDate),
      parseISO(startDate)
    )
    if (rangeDays > maxRangeDays) {
      return NextResponse.json(
        { error: 'Intervalle de dates trop long (maximum 90 jours)' },
        { status: 400 }
      )
    }

    const prisma = getPrisma()
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        appliances: {
          include: {
            appliance: true
          }
        }
      }
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    }

    const prompt = buildMealPlanPrompt(
      { cuisineType: profile.cuisineType ?? undefined, appliances: profile.appliances },
      startDate,
      endDate
    )

    const mealPlan = await generateMealPlan(prompt)

    if (!hasValidMealDates(mealPlan.days)) {
      return NextResponse.json({ error: 'Date de repas invalide' }, { status: 400 })
    }

    if (!datesWithinRange(mealPlan.days, startDate, endDate)) {
      return NextResponse.json({ error: 'Date de repas invalide' }, { status: 400 })
    }

    const plan = await saveMealPlan(
      mealPlan,
      { cuisineType: profile.cuisineType ?? undefined },
      userId,
      startDate,
      endDate
    )

    return NextResponse.json({
      success: true,
      planId: plan.id,
      mealPlan
    })
  } catch (error) {
    console.error('Erreur lors de la génération du plan repas:', error)
    if (error instanceof Error && error.message === 'Invalid meal plan format') {
      return NextResponse.json(
        { error: 'Format du plan repas invalide' },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'Échec de la génération du plan repas' },
      { status: 500 }
    )
  }
})
