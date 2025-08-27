import { z } from 'zod'
import { isValidDate } from '../date-utils'

export const requestSchema = z.object({
  startDate: z.string().refine(isValidDate, {
    message: 'Date de début invalide',
  }),
  endDate: z.string().refine(isValidDate, {
    message: 'Date de fin invalide',
  }),
})
