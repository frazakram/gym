import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminUser } from '@/lib/admin'
import DashboardClient from './DashboardClient'

export const runtime = 'nodejs'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const isAdmin = await isAdminUser(session.userId)
  if (isAdmin) redirect('/admin')

  return <DashboardClient />
}

