'use client'

import { useState, useEffect } from 'react'
import { Check, WifiOff } from 'lucide-react'

export function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(true)
    const [showOffline, setShowOffline] = useState(false)

    useEffect(() => {
        // Check initial status
        setIsOnline(navigator.onLine)
        setShowOffline(!navigator.onLine)

        const handleOnline = () => {
            setIsOnline(true)
            // Show "back online" briefly then hide
            setTimeout(() => setShowOffline(false), 2000)
        }

        const handleOffline = () => {
            setIsOnline(false)
            setShowOffline(true)
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    if (!showOffline) return null

    return (
        <div
            className={`
        fixed top-0 left-0 right-0 z-[100] 
        px-4 py-2 text-center text-sm font-medium
        transition-all duration-300 ease-out
        ${isOnline
                    ? 'bg-emerald-500/90 text-white'
                    : 'bg-amber-500/90 text-slate-900'
                }
      `}
        >
            {isOnline ? (
                <span className="flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    Back online
                </span>
            ) : (
                <span className="flex items-center justify-center gap-2">
                    <WifiOff className="w-4 h-4 animate-pulse" />
                    Offline - Using cached data
                </span>
            )}
        </div>
    )
}
