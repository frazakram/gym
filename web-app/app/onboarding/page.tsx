import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getProfile, initializeDatabase } from '@/lib/db'
import OnboardingWizard from './OnboardingWizard'

export const runtime = 'nodejs'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  await initializeDatabase()
  const profile = await getProfile(session.userId)

  const params = await searchParams
  const isReset = params?.reset === 'true'

  // If the user already has a profile and didn't ask to re-setup, skip onboarding
  if (profile && !isReset) redirect('/dashboard')

  return <OnboardingWizard isReset={isReset} />
}
