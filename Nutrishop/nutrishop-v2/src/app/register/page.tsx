'use client'

import { useState } from 'react'
import { fetchJson, ApiError } from '@/lib/http'
import { registerSchema } from '@/lib/types'
import type { z } from 'zod'

type RegisterInput = z.infer<typeof registerSchema>
interface RegisterResponse {
  success: boolean
}

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterInput>({
    email: '',
    username: '',
    password: '',
  })
  const [message, setMessage] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    try {
      await fetchJson<RegisterResponse>('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setMessage('Inscription réussie')
    } catch (err) {
      if (err instanceof ApiError) {
        setMessage(err.status >= 500 ? 'Erreur serveur' : err.message)
      } else {
        setMessage('Erreur inconnue')
      }
    }
  }

  return (
    <main>
      <h1>Inscription</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Email"
        />
        <input
          type="text"
          name="username"
          value={form.username}
          onChange={handleChange}
          placeholder="Nom d'utilisateur"
        />
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Mot de passe"
        />
        <button type="submit">Envoyer</button>
      </form>
      {message && <p>{message}</p>}
    </main>
  )
}
