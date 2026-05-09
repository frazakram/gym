'use client'

import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'

export function ThemeToggle({ className }: { className?: string } = {}) {
  const [dark, setDark] = useState(false)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    const isLocked = document.body.dataset.lightModeLocked === 'true'
    setLocked(isLocked)
    if (isLocked) {
      document.documentElement.classList.add('dark')
      setDark(true)
      return
    }
    const saved = localStorage.getItem('theme')
    let isDark: boolean
    if (saved === 'dark') {
      isDark = true
    } else if (saved === 'light') {
      isDark = false
    } else {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    document.documentElement.classList.toggle('dark', isDark)
    setDark(isDark)
  }, [])

  function toggle() {
    if (locked) {
      toast('🔒 Dark mode only — light mode coming soon!')
      return
    }
    const isDark = document.documentElement.classList.toggle('dark')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
    setDark(isDark)
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={`${className ?? 'absolute top-4 right-4 z-50'} p-2 rounded-full transition-colors ${
        dark
          ? 'bg-white/10 hover:bg-white/20'
          : 'bg-black/10 hover:bg-black/20'
      } ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className="flex items-center gap-1">
        {dark ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
        {locked && <Lock size={12} className="text-white/70" aria-hidden="true" />}
      </span>
    </button>
  )
}
