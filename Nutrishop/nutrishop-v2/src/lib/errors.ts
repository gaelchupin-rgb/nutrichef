export const PAYLOAD_TOO_LARGE = 'Corps de requête trop volumineux'
export const JSON_INVALIDE = 'Requête JSON invalide'
export const REPONSE_NON_JSON = 'Réponse non JSON du serveur'
export const REPONSE_JSON_INVALIDE = 'Réponse JSON invalide'
export const ERREUR_INCONNUE = 'Erreur inconnue'
export const TOO_MANY_REQUESTS = 'Trop de requêtes'

export class PayloadTooLargeError extends Error {
  constructor() {
    super(PAYLOAD_TOO_LARGE)
  }
}

export class InvalidJsonError extends Error {
  constructor() {
    super(JSON_INVALIDE)
  }
}
