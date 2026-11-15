'use client'

import { useState } from 'react'

/** localStorage key written by the sidebar's AI settings panel (components/Sidebar.tsx). */
export const AI_SETTINGS_STORAGE_KEY = 'gymbro_ai_settings'

export type AiModelProvider = 'OpenAI' | 'Anthropic'

type StoredAiSettings = { apiKey?: string; modelProvider?: AiModelProvider; model?: string }

/** The saved AI settings, or null when absent, unreadable or rendering on the server. */
function readStoredAiSettings(): StoredAiSettings | null {
  if (typeof window === 'undefined') return null
  try {
    const saved = localStorage.getItem(AI_SETTINGS_STORAGE_KEY)
    return saved ? (JSON.parse(saved) as StoredAiSettings) : null
  } catch {
    return null
  }
}

/**
 * The user's own AI provider, model and API key (client-side only; sent with
 * AI requests). Read from localStorage once, on first render.
 */
export function useAiSettings() {
  const [userApiKey, setUserApiKey] = useState(() => readStoredAiSettings()?.apiKey || '')
  const [userModelProvider, setUserModelProvider] = useState<AiModelProvider>(
    () => readStoredAiSettings()?.modelProvider || 'OpenAI',
  )
  const [userModel, setUserModel] = useState(() => readStoredAiSettings()?.model || '')

  return { userApiKey, setUserApiKey, userModelProvider, setUserModelProvider, userModel, setUserModel }
}
