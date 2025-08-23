import { z } from 'zod'
import { isValidDate } from '../date-utils'

export const registerSchema = z.object({
  email: z.string().trim().email(),
  username: z.string().trim().min(3),
  password: z
    .string()
    .min(8)
    .regex(/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9])/, {
      message:
        'Le mot de passe doit contenir au moins 8 caractères avec majuscule, minuscule, chiffre et symbole',
    }),
})

export const requestSchema = z.object({
  startDate: z.string().refine(isValidDate, {
    message: 'Date de début invalide',
  }),
  endDate: z.string().refine(isValidDate, {
    message: 'Date de fin invalide',
  }),
})
