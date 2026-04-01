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
      theme="dark"
      toastOptions={{
        className: 'neon-edge-toast',
        style: {
          background: 'rgba(15, 15, 30, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          color: '#e2e8f0',
          boxShadow: '0 8px 32px rgba(139, 92, 246, 0.15)',
          borderRadius: '1rem',
        },
      }}
    />
  )
}
