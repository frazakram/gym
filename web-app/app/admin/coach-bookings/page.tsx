'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { AnimatedButton } from '@/components/ui/AnimatedButton'

type AdminBooking = {
  id: number
  user_id: number
  username: string | null
  coach_name: string
  coach_phone: string
  coach_email: string
  preferred_at: string | null
  message: string | null
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | string
  created_at: string
}

const STATUS_OPTIONS = ['pending', 'confirmed', 'cancelled', 'completed'] as const

export default function AdminCoachBookingsPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string>('')

  const [statusFilter, setStatusFilter] = useState<string>('') // empty = all
  const [loading, setLoading] = useState(false)
  const [bookings, setBookings] = useState<AdminBooking[]>([])

  const filteredTitle = useMemo(() => {
    return statusFilter ? `Coach bookings (${statusFilter})` : 'Coach bookings (all)'
  }, [statusFilter])

  const checkAdmin = async () => {
    setChecking(true)
    try {
      const res = await fetch('/api/admin/whoami', { cache: 'no-store' })
      if (res.status === 401) {
        router.push('/login')
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to verify admin access')
      const ok = Boolean(data?.isAdmin)
      setIsAdmin(ok)
      if (!ok) setError('You are not authorized to view this page.')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setChecking(false)
    }
  }

  const fetchBookings = async () => {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams()
      if (statusFilter) qs.set('status', statusFilter)
      qs.set('limit', '50')
      const res = await fetch(`/api/admin/coach/bookings?${qs.toString()}`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) {
        router.push('/login')
        return
      }
      if (res.status === 403) {
        setError('Forbidden')
        setIsAdmin(false)
        return
      }
      if (!res.ok) throw new Error(data?.error || 'Failed to load bookings')
      setBookings((data.bookings || []) as AdminBooking[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void checkAdmin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!checking && isAdmin) {
      void fetchBookings()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, isAdmin, statusFilter])

  const updateStatus = async (id: number, nextStatus: (typeof STATUS_OPTIONS)[number]) => {
    try {
      const res = await fetch(`/api/admin/coach/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to update status')
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: nextStatus } : b)))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-screen-md mx-auto pb-24 px-4 pt-6 space-y-4">
        <GlassCard className="p-4">
          <SectionHeader title="Admin" subtitle="Manage personal coach booking requests" />
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-60 px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-white/10 bg-transparent"
            >
              <option value="" className="bg-slate-900">
                All statuses
              </option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="bg-slate-900">
                  {s}
                </option>
              ))}
            </select>

            <AnimatedButton
              variant="secondary"
              onClick={() => void fetchBookings()}
              disabled={!isAdmin || loading || checking}
              loading={loading}
              fullWidth
            >
              Refresh
            </AnimatedButton>

            <AnimatedButton variant="ghost" onClick={() => router.push('/admin/coach-approvals')} fullWidth>
              Coach applications
            </AnimatedButton>
          </div>

          {checking ? (
            <div className="mt-4 text-sm text-slate-300/70">Checking admin access…</div>
          ) : error ? (
            <div className="mt-4 text-sm text-red-200">{error}</div>
          ) : null}
        </GlassCard>

        {isAdmin ? (
          <GlassCard className="p-4">
            <SectionHeader title={filteredTitle} subtitle={`${bookings.length} results (max 50)`} />

            {loading && bookings.length === 0 ? (
              <div className="mt-4 text-sm text-slate-300/70">Loading…</div>
            ) : bookings.length === 0 ? (
              <div className="mt-4 text-sm text-slate-300/70">No bookings found.</div>
            ) : (
              <div className="mt-3 space-y-2">
                {bookings.map((b) => (
                  <div key={b.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">
                          #{b.id}{' '}
                          <span className="text-slate-300/70 font-normal">
                            • user {b.user_id}
                            {b.username ? ` (${b.username})` : ''}
                          </span>
                        </p>
                        <p className="text-xs text-slate-300/70 mt-1">
                          Coach: {b.coach_name} • Preferred:{' '}
                          {b.preferred_at ? new Date(b.preferred_at).toLocaleString() : 'Not specified'}
                        </p>
                        {b.message ? (
                          <p className="text-xs text-slate-200/80 mt-2 whitespace-pre-wrap">{b.message}</p>
                        ) : null}
                        <div className="mt-2 text-[11px] text-slate-300/60">
                          Created: {new Date(b.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-2">
                        <select
                          value={String(b.status)}
                          onChange={(e) => {
                            const v = e.target.value as (typeof STATUS_OPTIONS)[number]
                            void updateStatus(b.id, v)
                          }}
                          className="px-3 py-2 glass-soft rounded-xl text-white ui-focus-ring border border-white/10 bg-transparent text-xs"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s} className="bg-slate-900">
                              {s}
                            </option>
                          ))}
                        </select>
                        <div className="text-[11px] text-slate-200/70 glass-soft px-2.5 py-1 rounded-full border border-white/10">
                          {b.status}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        ) : null}
      </div>
    </div>
  )
}

