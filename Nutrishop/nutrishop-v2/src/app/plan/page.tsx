"use client"

import { useState } from 'react'

export default function PlanPage() {
  const [form, setForm] = useState({ startDate: '', endDate: '' })
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/ai/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erreur inconnue')
      } else {
        setResult(data)
      }
    } catch (err) {
      setError('Erreur réseau')
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
      {error && <p>{error}</p>}
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </main>
  )
}
