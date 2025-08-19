import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { getPrisma } from '@/lib/db'
import { generateMealPlan } from '@/lib/gemini'
import { buildMealPlanPrompt } from '@/lib/prompts'
import { isValidDateRange, hasValidMealDates, isValidDate } from '@/lib/date-utils'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { z } from 'zod'
import {
  sessionFetcher,
  mealPlanSchema,
  datesWithinRange,
  saveMealPlan,
} from '@/lib/meal-plan'
import { rateLimit } from '@/middleware/rate-limit'

const requestSchema = z.object({
  startDate: z.string().refine(isValidDate, {
    message: 'Invalid startDate'
  }),
  endDate: z.string().refine(isValidDate, {
    message: 'Invalid endDate'
  })
})

export async function POST(req: NextRequest) {
  try {
    const limit = rateLimit(req)
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Unsupported Media Type' }, { status: 415 })
    }
    const session = await sessionFetcher.get(authOptions)
    const userId = (session?.user as { id: string } | undefined)?.id

    if (!session || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    const { startDate, endDate } = parsed.data

    if (!isValidDateRange(startDate, endDate)) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
    }

    const maxRangeDays = 30
    const rangeDays = differenceInCalendarDays(
      parseISO(endDate),
      parseISO(startDate)
    )
    if (rangeDays > maxRangeDays) {
      return NextResponse.json({ error: 'Date range too long' }, { status: 400 })
    }

    // Get user profile
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
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Build prompt
    const prompt = buildMealPlanPrompt(
      { cuisineType: profile.cuisineType ?? undefined, appliances: profile.appliances },
      startDate,
      endDate
    )

    // Generate meal plan
    const mealPlan = await generateMealPlan(prompt)
    const parsedPlan = mealPlanSchema.safeParse(mealPlan)
    if (!parsedPlan.success) {
      return NextResponse.json(
        { error: 'Invalid meal plan format' },
        { status: 500 }
      )
    }
    const validMealPlan = parsedPlan.data

    if (!hasValidMealDates(validMealPlan.days)) {
      return NextResponse.json({ error: 'Invalid meal date' }, { status: 400 })
    }

    if (!datesWithinRange(validMealPlan.days, startDate, endDate)) {
      return NextResponse.json({ error: 'Invalid meal date' }, { status: 400 })
    }

    const plan = await saveMealPlan(
      validMealPlan,
      { cuisineType: profile.cuisineType ?? undefined },
      userId,
      startDate,
      endDate
    )

    return NextResponse.json({
      success: true,
      planId: plan.id,
      mealPlan: validMealPlan
    })
  } catch (error) {
    console.error('Error generating meal plan:', error)
    if (error instanceof Error && error.message === 'Invalid meal plan format') {
      return NextResponse.json(
        { error: 'Invalid meal plan format' },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to generate meal plan' },
      { status: 500 }
    )
  }
}
