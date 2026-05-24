import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { CookieConsent } from '@/components/CookieConsent'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'Gym Bro - AI - Powered Gym Routine Generator',
  description: 'Generate personalized weekly workout plans with AI',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Gym Bro',
  },
}

export const viewport: Viewport = {
  themeColor: '#00E5BC',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isLightModeLocked = process.env.LIGHT_MODE_LOCK === 'true'
  const themeScript = isLightModeLocked
    ? `(function(){document.documentElement.classList.add('dark');})();`
    : `(function(){var t=localStorage.getItem('theme');if(t!=='light'){document.documentElement.classList.add('dark');}})();`

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`min-h-screen text-gray-900 dark:text-slate-100 ${inter.variable} ${jakarta.variable}`}
        data-light-mode-locked={isLightModeLocked ? 'true' : undefined}
      >
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
