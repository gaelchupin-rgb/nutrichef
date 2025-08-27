'use client'

import { useState } from 'react'
import { fetchJson } from '@/lib/http'
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
  const [result, setResult] = useState<any>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResult(null)
    try {
      const data = await fetchJson<PlanResponse>('/api/ai/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setResult(data)
    } catch {
      alert('Impossible de générer le plan')
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
        />
        <input
          type="date"
          name="endDate"
          value={form.endDate}
          onChange={handleChange}
        />
        <button type="submit">Envoyer</button>
      </form>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </main>
  )
}
