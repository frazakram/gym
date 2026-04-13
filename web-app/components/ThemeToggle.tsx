'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const isDark = document.documentElement.classList.toggle('dark')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
    setDark(isDark)
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="absolute top-4 right-4 p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-white/50 dark:hover:bg-white/[0.06] transition-colors"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
