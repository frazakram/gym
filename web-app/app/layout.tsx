import type { Metadata, Viewport } from 'next'
import { Manrope, Sora } from 'next/font/google'
import './globals.css'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { CookieConsent } from '@/components/CookieConsent'

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans-app',
})

const sora = Sora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display-app',
})

export const metadata: Metadata = {
  title: 'Gym Bro - AI - Powered Gym Routine Generator',
  description: 'Generate personalized weekly workout plans with AI',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Gym Bro',
  },
}

export const viewport: Viewport = {
  themeColor: '#F2FAF7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`min-h-screen text-gray-900 ${manrope.variable} ${sora.variable}`}>
        <ServiceWorkerRegistration />
        <div className="app-shell" style={{ overflow: 'visible' }}>
          <div className="app-bg" />
          <div className="app-atmos" />
          <div className="app-content">{children}</div>
        </div>
        <ToastProvider />
        <CookieConsent />
      </body>
    </html>
  )
}
