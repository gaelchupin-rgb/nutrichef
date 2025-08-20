export async function fetchJson(input: RequestInfo | URL, init?: RequestInit) {
  const res = await fetch(input, init)
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '')
    throw new Error(text || 'Réponse non JSON du serveur')
  }
  let data: any
  try {
    data = await res.json()
  } catch {
    throw new Error('Réponse JSON invalide')
  }
  if (!res.ok) {
    throw new Error(data?.error || 'Erreur inconnue')
  }
  return data
}
