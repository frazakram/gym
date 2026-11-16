import type { Metadata, Viewport } from 'next'
import { Manrope, Plus_Jakarta_Sans, Sora } from 'next/font/google'
import './globals.css'
import './design-tokens.css'
import './gb-ui.css'
import { themeInitScript } from '@/lib/theme'
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

// Navy and Pink redesign typeface (font-gb); used by migrated screens only.
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-gb-app',
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
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        {/* Sets data-theme before first paint (no flash). Static string from lib/theme.ts, no user input. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`min-h-screen text-gray-900 ${manrope.variable} ${sora.variable} ${plusJakarta.variable}`}>
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
