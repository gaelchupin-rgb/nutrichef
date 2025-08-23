import { parseISO, isValid as isValidDateFns, format } from 'date-fns'

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/

export function isValidDate(date: string) {
  if (!isoDateRegex.test(date)) return false
  const parsed = parseISO(date)
  return isValidDateFns(parsed) && format(parsed, 'yyyy-MM-dd') === date
}

export function isValidDateRange(start: string, end: string) {
  return (
    isValidDate(start) && isValidDate(end) && new Date(start) <= new Date(end)
  )
}

export function hasValidMealDates(days: Array<{ date: string }>) {
  return days.every((day) => isValidDate(day.date))
}
