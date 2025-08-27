'use client'

import { useState } from 'react'
import { requestSchema } from '@/lib/types'
import type { z } from 'zod'

type PlanRequest = z.infer<typeof requestSchema>
interface PlanResponse {
  success: boolean
  planId: number
  mealPlan: any
}

export default function PlanPage() {
  const [form, setForm] = useState<PlanRequest>({ startDate: '', endDate: '' })
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    if (!form.startDate || !form.endDate) {
      setError('Les deux dates sont requises')
      return
    }
    if (form.startDate > form.endDate) {
      setError('La date de début doit précéder la date de fin')
      return
    }
    try {
      const res = await fetch('/api/ai/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        let message = 'Erreur inconnue'
        try {
          const errorData = await res.json()
          message = res.status >= 500 ? 'Erreur serveur' : errorData.error || message
        } catch {
          message = res.status >= 500 ? 'Erreur serveur' : message
        }
        setError(message)
        return
      }
      const data: PlanResponse = await res.json()
      setResult(data)
    } catch {
      setError('Erreur inconnue')
    }
  }

  return (
    <main>
      <h1>Générer un plan repas</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="date"
          name="startDate"
          value={form.startDate}
          onChange={handleChange}
          required
          max={form.endDate || undefined}
        />
        <input
          type="date"
          name="endDate"
          value={form.endDate}
          onChange={handleChange}
          required
          min={form.startDate || undefined}
        />
        <button type="submit">Envoyer</button>
      </form>
      {error && <p>{error}</p>}
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </main>
  )
}
