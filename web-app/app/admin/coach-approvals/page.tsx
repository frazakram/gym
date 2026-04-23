'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { AnimatedButton } from '@/components/ui/AnimatedButton'

type AdminCoachRow = {
  id: number
  user_id: number
  username: string | null
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  created_at: string | Date
  profile: {
    coach_id: number
    display_name: string
    bio: string | null
    experience_years: number | null
    certifications: string | null
    specialties: string[] | null
    languages: string[] | null
    timezone: string | null
    phone: string | null
    email: string | null
  } | null
}

const STATUS = ['pending', 'approved', 'rejected'] as const

export default function AdminCoachApprovalsPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string>('')

  const [statusFilter, setStatusFilter] = useState<(typeof STATUS)[number]>('pending')
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<AdminCoachRow[]>([])
  const [notesDraft, setNotesDraft] = useState<Record<number, string>>({})

  const title = useMemo(() => `Coach approvals (${statusFilter})`, [statusFilter])

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

  const fetchRows = async () => {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams()
      qs.set('status', statusFilter)
      qs.set('limit', '50')
      const res = await fetch(`/api/admin/coaches?${qs.toString()}`, { cache: 'no-store' })
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
      if (!res.ok) throw new Error(data?.error || 'Failed to load coach applications')
      setRows((data.coaches || []) as AdminCoachRow[])
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
    if (!checking && isAdmin) void fetchRows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, isAdmin, statusFilter])

  const setStatus = async (coachId: number, status: (typeof STATUS)[number]) => {
    try {
      const admin_notes = (notesDraft[coachId] || '').trim() || null
      const res = await fetch(`/api/admin/coaches/${coachId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_notes }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to update status')
      setRows((prev) => prev.map((r) => (r.id === coachId ? { ...r, status, admin_notes } : r)))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-screen-md mx-auto pb-24 px-4 pt-6 space-y-4">
        <GlassCard className="p-4">
          <SectionHeader
            title="Admin · Coach Approvals"
            subtitle="Approve or reject coach signups"
            right={
              <span className="text-xs bg-red-500/15 border border-red-500/20 text-red-300 px-2.5 py-1 rounded-full font-medium">
                Admin
              </span>
            }
          />
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full sm:w-60 px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-white/10 bg-transparent"
            >
              {STATUS.map((s) => (
                <option key={s} value={s} className="bg-slate-900">
                  {s}
                </option>
              ))}
            </select>

            <AnimatedButton
              type="button"
              variant="secondary"
              onClick={() => void fetchRows()}
              disabled={!isAdmin || loading || checking}
              loading={loading}
              fullWidth
            >
              Refresh
            </AnimatedButton>

            <AnimatedButton type="button" variant="ghost" onClick={() => router.push('/admin/coach-bookings')} fullWidth>
              Coach requests
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
            <SectionHeader title={title} subtitle={`${rows.length} applications`} />

            {loading && rows.length === 0 ? (
              <div className="mt-4 text-sm text-slate-300/70">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="mt-4 text-sm text-slate-300/70">No coach applications.</div>
            ) : (
              <div className="mt-3 space-y-2">
                {rows.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-primary/15 bg-white/5 p-4 space-y-3">
                    {/* Row header */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-brand-cyan flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {(r.profile?.display_name ?? r.username ?? 'C').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-white">
                            {r.profile?.display_name ?? r.username ?? `Coach #${r.id}`}
                          </p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                            r.status === 'approved' ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300' :
                            r.status === 'rejected' ? 'bg-red-500/12 border-red-500/20 text-red-300' :
                            'bg-amber-400/15 border-amber-400/25 text-amber-300'
                          }`}>
                            {r.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          {r.profile?.experience_years != null ? `${r.profile.experience_years}y exp · ` : ''}
                          user {r.user_id}{r.username ? ` (${r.username})` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Profile details */}
                    {r.profile ? (
                      <div className="rounded-xl bg-white/3 border border-white/6 p-3 space-y-1.5 text-xs">
                        {r.profile.email || r.profile.phone ? (
                          <div className="flex gap-4 flex-wrap">
                            {r.profile.email && <span><span className="text-muted">Email:</span> <span className="text-slate-200">{r.profile.email}</span></span>}
                            {r.profile.phone && <span><span className="text-muted">Phone:</span> <span className="text-slate-200">{r.profile.phone}</span></span>}
                          </div>
                        ) : null}
                        {r.profile.certifications && (
                          <div><span className="text-muted">Cert:</span> <span className="text-slate-200">{r.profile.certifications}</span></div>
                        )}
                        {r.profile.bio && (
                          <p className="text-slate-200/80 mt-1 line-clamp-3">{r.profile.bio}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted">No profile attached.</p>
                    )}

                    {/* Admin notes + quick action */}
                    <textarea
                      value={notesDraft[r.id] ?? r.admin_notes ?? ''}
                      onChange={(e) => setNotesDraft((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder="Admin notes (optional)"
                      rows={2}
                      className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                    <div className="flex gap-2">
                      <AnimatedButton
                        type="button"
                        variant="primary"
                        fullWidth
                        onClick={() => void setStatus(r.id, 'approved')}
                        disabled={r.status === 'approved'}
                      >
                        Approve
                      </AnimatedButton>
                      <AnimatedButton
                        type="button"
                        variant="ghost"
                        fullWidth
                        onClick={() => void setStatus(r.id, 'rejected')}
                        disabled={r.status === 'rejected'}
                        className="!border-red-500/20 !text-red-300 hover:!bg-red-500/10"
                      >
                        Reject
                      </AnimatedButton>
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

