'use client'

import { useSyncExternalStore } from 'react'
import { parseThemeChoice, resolveTheme, THEME_STORAGE_KEY, type Theme, type ThemeChoice } from '@/lib/theme'

/**
 * One theme store for the whole page: every theme button and the Profile
 * setting read and write the same state. data-theme on <html> was already set
 * before first paint by themeInitScript; this keeps it in step afterwards.
 */

type ThemeState = { choice: ThemeChoice; theme: Theme }

const SERVER_STATE: ThemeState = { choice: 'system', theme: 'light' }
const listeners = new Set<() => void>()
let state: ThemeState | null = null
let watchingSystem = false

const prefersDark = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
const prefersReducedMotion = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function readChoice(): ThemeChoice {
  try { return parseThemeChoice(window.localStorage.getItem(THEME_STORAGE_KEY)) } catch { return 'system' }
}

function compute(choice: ThemeChoice): ThemeState {
  return { choice, theme: resolveTheme({ choice, systemPrefersDark: prefersDark() }) }
}

function apply(next: ThemeState) {
  state = next
  document.documentElement.setAttribute('data-theme', next.theme)
  listeners.forEach((notify) => notify())
}

function getSnapshot(): ThemeState {
  if (!state) state = compute(readChoice())
  return state
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  if (!watchingSystem && typeof window.matchMedia === 'function') {
    watchingSystem = true
    // "System" follows the phone when it switches between light and dark.
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (getSnapshot().choice === 'system') apply(compute('system'))
    })
  }
  return () => { listeners.delete(notify) }
}

/** Changes the theme; with an origin point, the new theme grows from there in a circle. */
export function setThemeChoice(choice: ThemeChoice, origin?: { x: number; y: number }) {
  try { window.localStorage.setItem(THEME_STORAGE_KEY, choice) } catch { /* private mode: still switch for this visit */ }
  const next = compute(choice)
  const doc = document as Document & { startViewTransition?: (update: () => void) => { finished: Promise<void> } }
  if (!origin || !doc.startViewTransition || prefersReducedMotion() || next.theme === getSnapshot().theme) {
    apply(next)
    return
  }
  const root = document.documentElement
  root.style.setProperty('--gb-vt-x', `${Math.round(origin.x)}px`)
  root.style.setProperty('--gb-vt-y', `${Math.round(origin.y)}px`)
  root.classList.add('gb-vt-theme')
  doc.startViewTransition(() => apply(next)).finished.finally(() => root.classList.remove('gb-vt-theme'))
}

export function useTheme(): ThemeState {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_STATE)
}
