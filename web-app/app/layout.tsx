import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GymBro AI - AI-Powered Gym Routine Generator',
  description: 'Generate personalized weekly workout plans with AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-100">
        <div className="app-shell">
          <div className="app-bg" />
          <div className="app-atmos" />
          <div className="app-content">{children}</div>
        </div>
      </body>
    </html>
  )
}
