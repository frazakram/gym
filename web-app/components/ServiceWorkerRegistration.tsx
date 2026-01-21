'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            // Register service worker on load
            window.addEventListener('load', () => {
                navigator.serviceWorker
                    .register('/sw.js')
                    .then((registration) => {
                        console.log('[App] Service Worker registered:', registration.scope)

                        // Check for updates periodically
                        setInterval(() => {
                            registration.update()
                        }, 60 * 60 * 1000) // Every hour

                        // Handle updates
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing
                            if (newWorker) {
                                newWorker.addEventListener('statechange', () => {
                                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                        // New content available, could prompt user to refresh
                                        console.log('[App] New content available, refresh to update')
                                    }
                                })
                            }
                        })
                    })
                    .catch((error) => {
                        console.log('[App] Service Worker registration failed:', error)
                    })
            })

            // Handle controller change (new service worker activated)
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('[App] Controller changed, new service worker active')
            })
        }
    }, [])

    return null
}
