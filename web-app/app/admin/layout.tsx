import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { isAdminUser } from '@/lib/admin'

export const runtime = 'nodejs'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const ok = await isAdminUser(session.userId)
  if (!ok) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-screen-md mx-auto px-4 pt-6 pb-24 space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">Admin</div>
            <div className="text-xs text-slate-300/70">Coach approvals & booking requests</div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="text-[11px] px-3 py-1.5 rounded-full btn-secondary transition ui-focus-ring"
            >
              Home
            </Link>
            <Link
              href="/admin/coach-approvals"
              className="text-[11px] px-3 py-1.5 rounded-full btn-secondary transition ui-focus-ring"
            >
              Coach Applications
            </Link>
            <Link
              href="/admin/coach-bookings"
              className="text-[11px] px-3 py-1.5 rounded-full btn-secondary transition ui-focus-ring"
            >
              Coach Requests
            </Link>
          </div>
        </div>

        {children}
      </div>
    </div>
  )
}

