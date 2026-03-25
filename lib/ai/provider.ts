import { anthropic } from '@ai-sdk/anthropic'
import { createOpenAI, openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'
import type { LanguageModel } from 'ai'

/**
 * Returns the configured AI model based on available API keys.
 * Priority: ANTHROPIC_API_KEY → OPENAI_API_KEY → GOOGLE_GENERATIVE_AI_API_KEY → DEEPSEEK_API_KEY
 */
export function getAIModel(): LanguageModel {
  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic('claude-sonnet-4-6')
  }
  if (process.env.OPENAI_API_KEY) {
    return openai('gpt-4o')
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google('gemini-2.0-flash')
  }
  if (process.env.DEEPSEEK_API_KEY) {
    const deepseek = createOpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1',
    })
    return deepseek('deepseek-chat')
  }
  throw new Error(
    'No AI provider configured. Set one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, or DEEPSEEK_API_KEY in .env.local'
  )
}
