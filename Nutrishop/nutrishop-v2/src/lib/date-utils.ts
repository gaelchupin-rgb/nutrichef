const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/

function isValidDate(date: string) {
  return isoDateRegex.test(date) && !isNaN(Date.parse(date))
}

export function isValidDateRange(start: string, end: string) {
  return isValidDate(start) && isValidDate(end) && new Date(start) <= new Date(end)
}

export function hasValidMealDates(days: Array<{ date: string }>) {
  return days.every((day) => isValidDate(day.date))
}
