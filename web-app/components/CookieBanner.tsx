'use client'

import { useEffect, useState } from 'react'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('cookiesAccepted') === null) {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  function accept() {
    localStorage.setItem('cookiesAccepted', 'true')
    setVisible(false)
  }

  function decline() {
    localStorage.setItem('cookiesAccepted', 'false')
    setVisible(false)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-white">
      <p className="flex-1">
        We use cookies to keep you logged in and remember your preferences.
      </p>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={decline}
          className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/20 text-gray-500 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors"
        >
          Decline
        </button>
        <button
          onClick={accept}
          className="px-3 py-1.5 rounded-lg bg-[#22c55e] text-white hover:bg-[#16a34a] transition-colors"
        >
          Accept
        </button>
      </div>
    </div>
  )
}
