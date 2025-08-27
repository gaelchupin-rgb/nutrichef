import gemini from './gemini'
import openai from './openai'
import anthropic from './anthropic'
import type { LLMProvider } from './types'

export * from './types'

export function getProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER?.toLowerCase()
  switch (provider) {
    case 'openai':
      return openai
    case 'anthropic':
      return anthropic
    case 'gemini':
    default:
      return gemini
  }
}
