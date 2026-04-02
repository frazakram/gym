import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getProfile, initializeDatabase } from '@/lib/db'
import OnboardingWizard from './OnboardingWizard'

export const runtime = 'nodejs'

export default async function OnboardingPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  await initializeDatabase()
  const profile = await getProfile(session.userId)

  // If the user already has a profile, skip onboarding
  if (profile) redirect('/dashboard')

  return <OnboardingWizard />
}
