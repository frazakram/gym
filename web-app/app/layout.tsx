import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Gym Bro - AI - Powered Gym Routine Generator',
  description: 'Generate personalized weekly workout plans with AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`min-h-screen text-slate-100 ${inter.variable}`}>
        <div className="app-shell">
          <div className="app-bg" />
          <div className="app-atmos" />
          <div className="app-content">{children}</div>
        </div>
      </body>
    </html>
  )
}
