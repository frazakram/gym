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
          <SectionHeader title="Admin" subtitle="Approve or reject coach signups" />
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

            <AnimatedButton type="button" variant="ghost" onClick={() => router.push('/dashboard')} fullWidth>
              Back to Dashboard
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
                  <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">
                          Coach #{r.id}{' '}
                          <span className="text-slate-300/70 font-normal">
                            • user {r.user_id}
                            {r.username ? ` (${r.username})` : ''}
                          </span>
                        </p>
                        <p className="text-xs text-slate-300/70 mt-1">
                          Status: <span className="text-slate-200">{r.status}</span>
                        </p>

                        {r.profile ? (
                          <div className="mt-2 text-xs text-slate-200/80 space-y-1">
                            <div>
                              <span className="text-slate-300/70">Name:</span> {r.profile.display_name}
                            </div>
                            <div>
                              <span className="text-slate-300/70">Experience:</span>{' '}
                              {r.profile.experience_years != null ? `${r.profile.experience_years} years` : '—'}
                            </div>
                            <div>
                              <span className="text-slate-300/70">Email:</span> {r.profile.email || '—'}{' '}
                              <span className="text-slate-300/70">Phone:</span> {r.profile.phone || '—'}
                            </div>
                            {r.profile.certifications ? (
                              <div>
                                <span className="text-slate-300/70">Certifications:</span> {r.profile.certifications}
                              </div>
                            ) : null}
                            {r.profile.bio ? (
                              <div className="text-slate-200/80 whitespace-pre-wrap">
                                <span className="text-slate-300/70">Bio:</span> {r.profile.bio}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="mt-2 text-xs text-slate-300/70">No profile attached.</div>
                        )}
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-2 w-56">
                        <select
                          value={r.status}
                          onChange={(e) => void setStatus(r.id, e.target.value as any)}
                          className="px-3 py-2 glass-soft rounded-xl text-white ui-focus-ring border border-white/10 bg-transparent text-xs w-full"
                        >
                          {STATUS.map((s) => (
                            <option key={s} value={s} className="bg-slate-900">
                              {s}
                            </option>
                          ))}
                        </select>
                        <textarea
                          value={notesDraft[r.id] ?? r.admin_notes ?? ''}
                          onChange={(e) => setNotesDraft((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          placeholder="Admin notes (optional)"
                          rows={3}
                          className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-cyan-400/30 resize-none"
                        />
                        <AnimatedButton
                          type="button"
                          variant="secondary"
                          fullWidth
                          onClick={() => void setStatus(r.id, r.status)}
                        >
                          Save
                        </AnimatedButton>
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

