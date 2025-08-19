export function isValidDateRange(start: string, end: string) {
  return new Date(start) <= new Date(end)
}

export function hasValidMealDates(days: Array<{ date: string }>) {
  return days.every((day) => !isNaN(Date.parse(day.date)))
}
