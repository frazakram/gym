'use client'

import { Toaster } from 'sonner'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

/**
 * Toast component is now a no-op since Sonner handles all toast rendering.
 * Kept for backwards compatibility with any existing imports.
 */
export function Toast() {
  return <div />
}

/**
 * ToastContainer renders Sonner's Toaster with Neon Edge theme styling.
 * Drop this in your layout or dashboard root. Accepts any props for
 * backwards compatibility but ignores them (Sonner manages its own state).
 */
export function ToastContainer(props?: Record<string, unknown>) {
  return (
    <Toaster
      position="top-center"
      richColors
      theme="light"
      toastOptions={{
        className: 'neon-edge-toast',
        style: {
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(16px) saturate(1.5)',
          border: '1px solid rgba(255, 255, 255, 0.85)',
          color: '#0A2E29',
          boxShadow: '0 8px 32px rgba(8, 76, 64, 0.14)',
          borderRadius: '1rem',
        },
      }}
    />
  )
}
