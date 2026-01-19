import Link from 'next/link'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionHeader } from '@/components/ui/SectionHeader'

export default function AdminHomePage() {
  return (
    <div className="space-y-4">
      <GlassCard className="p-4">
        <SectionHeader title="Admin home" subtitle="Manage coaches and coach booking requests" />
      </GlassCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href="/admin/coach-approvals" className="block">
          <GlassCard className="p-4 hover:bg-white/10 transition-colors">
            <div className="text-sm font-semibold text-white">Coach applications</div>
            <div className="text-xs text-slate-300/70 mt-1">Approve or reject coach profiles</div>
          </GlassCard>
        </Link>
        <Link href="/admin/coach-bookings" className="block">
          <GlassCard className="p-4 hover:bg-white/10 transition-colors">
            <div className="text-sm font-semibold text-white">Coach booking requests</div>
            <div className="text-xs text-slate-300/70 mt-1">Confirm/cancel/completed requests from users</div>
          </GlassCard>
        </Link>
      </div>
    </div>
  )
}

