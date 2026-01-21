'use client'

import { useEffect, useCallback } from 'react'

const SESSION_KEY = 'gymbro_session_active'
const SESSION_TIMESTAMP_KEY = 'gymbro_session_timestamp'

/**
 * Custom hook to persist session indicator in localStorage.
 * This helps maintain session state when Android kills the app
 * while it's in the background.
 */
export function useSessionPersistence() {
    // Mark session as active in localStorage
    const markSessionActive = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(SESSION_KEY, 'true')
            localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString())
        }
    }, [])

    // Clear session from localStorage
    const clearSession = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(SESSION_KEY)
            localStorage.removeItem(SESSION_TIMESTAMP_KEY)
        }
    }, [])

    // Check if session was previously active
    const wasSessionActive = useCallback((): boolean => {
        if (typeof window === 'undefined') return false

        const isActive = localStorage.getItem(SESSION_KEY) === 'true'
        const timestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY)

        if (!isActive || !timestamp) return false

        // Session is valid for 7 days (matching cookie expiry)
        const sessionAge = Date.now() - parseInt(timestamp, 10)
        const sevenDays = 7 * 24 * 60 * 60 * 1000

        if (sessionAge > sevenDays) {
            clearSession()
            return false
        }

        return true
    }, [clearSession])

    // Refresh session timestamp (call on user activity)
    const refreshSession = useCallback(() => {
        if (typeof window !== 'undefined' && localStorage.getItem(SESSION_KEY) === 'true') {
            localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString())
        }
    }, [])

    return {
        markSessionActive,
        clearSession,
        wasSessionActive,
        refreshSession,
    }
}

/**
 * Store session indicator after login
 */
export function storeSessionIndicator() {
    if (typeof window !== 'undefined') {
        localStorage.setItem(SESSION_KEY, 'true')
        localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString())
    }
}

/**
 * Clear session indicator on logout
 */
export function clearSessionIndicator() {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(SESSION_KEY)
        localStorage.removeItem(SESSION_TIMESTAMP_KEY)
    }
}

/**
 * Check if there was an active session
 */
export function hasActiveSession(): boolean {
    if (typeof window === 'undefined') return false

    const isActive = localStorage.getItem(SESSION_KEY) === 'true'
    const timestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY)

    if (!isActive || !timestamp) return false

    const sessionAge = Date.now() - parseInt(timestamp, 10)
    const sevenDays = 7 * 24 * 60 * 60 * 1000

    return sessionAge <= sevenDays
}
