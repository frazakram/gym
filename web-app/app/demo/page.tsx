'use client'

import DashboardClient from '../dashboard/DashboardClient'
import { DemoModeProvider } from '@/components/DemoModeProvider'
import { DemoSignUpBanner } from '@/components/DemoSignUpBanner'

export default function DemoPage() {
  return (
    <DemoModeProvider>
      <DashboardClient />
      <DemoSignUpBanner />
    </DemoModeProvider>
  )
}
