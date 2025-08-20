"use client"

import { useState } from 'react'

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', username: '', password: '' })
  const [message, setMessage] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || 'Erreur inconnue')
      } else {
        setMessage('Inscription réussie')
      }
    } catch (err) {
      setMessage('Erreur réseau')
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
