'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { AnimatedButton } from '@/components/ui/AnimatedButton'

type Coach = {
  id: string
  name: string
  phone: string
  email: string
}

type CoachPublic = {
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
}

type CoachBooking = {
  id: number
  coach_name: string
  coach_phone: string
  coach_email: string
  preferred_at: string | null
  message: string | null
  status: string
  created_at: string
}

export function CoachView({
  onUpgrade,
  showToast,
}: {
  onUpgrade: () => void
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
}) {
  const [coach, setCoach] = useState<Coach | null>(null)
  const [loadingCoach, setLoadingCoach] = useState(false)

  const [coaches, setCoaches] = useState<CoachPublic[]>([])
  const [selectedCoachId, setSelectedCoachId] = useState<number | null>(null)

  const [userName, setUserName] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [userPhone, setUserPhone] = useState<string>('')

  const [preferredAt, setPreferredAt] = useState<string>('')
  const [message, setMessage] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const [bookings, setBookings] = useState<CoachBooking[]>([])
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [mutatingBookingId, setMutatingBookingId] = useState<number | null>(null)

  const activeBooking = useMemo(() => {
    return bookings.find((b) => b.status === 'pending' || b.status === 'confirmed') ?? null
  }, [bookings])

  const minutesUntil = useCallback((iso: string | null): number | null => {
    if (!iso) return null
    const t = new Date(iso).getTime()
    if (!Number.isFinite(t)) return null
    return Math.floor((t - Date.now()) / (60 * 1000))
  }, [])

  const canCancelBooking = useCallback(
    (b: CoachBooking): { ok: boolean; reason?: string } => {
      if (b.status !== 'pending' && b.status !== 'confirmed') return { ok: false, reason: 'Not cancellable' }
      if (!b.preferred_at) return { ok: true }
      const mins = minutesUntil(b.preferred_at)
      if (mins == null) return { ok: true }
      if (mins <= 60) return { ok: false, reason: `Can't cancel within 60 minutes (${mins}m left)` }
      return { ok: true }
    },
    [minutesUntil]
  )

  const canDeleteBooking = useCallback((b: CoachBooking): boolean => {
    return b.status === 'cancelled' || b.status === 'completed'
  }, [])

  const telHref = useMemo(() => {
    const n = coach?.phone?.replace(/[^\d+]/g, '') || ''
    return n ? `tel:${n}` : '#'
  }, [coach?.phone])

  const mailHref = useMemo(() => {
    const e = coach?.email?.trim() || ''
    return e ? `mailto:${e}` : '#'
  }, [coach?.email])

  const fetchCoach = async () => {
    setLoadingCoach(true)
    try {
      const res = await fetch('/api/coach', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.status === 403) {
        onUpgrade()
        return
      }
      if (!res.ok) throw new Error(data?.error || 'Failed to load coach')
      setCoach(data.coach as Coach)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      showToast(msg, 'error')
    } finally {
      setLoadingCoach(false)
    }
  }

  const fetchCoaches = async () => {
    try {
      const res = await fetch('/api/coaches?limit=50', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return
      const list = (data.coaches || []) as CoachPublic[]
      setCoaches(list)
      if (list.length > 0 && selectedCoachId == null) {
        setSelectedCoachId(list[0]!.coach_id)
      }
    } catch {
      // ignore
    }
  }

  const fetchBookings = async () => {
    setLoadingBookings(true)
    try {
      const res = await fetch('/api/coach/bookings?limit=10', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to load bookings')
      setBookings((data.bookings || []) as CoachBooking[])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      showToast(msg, 'error')
    } finally {
      setLoadingBookings(false)
    }
  }

  useEffect(() => {
    void fetchCoach()
    void fetchCoaches()
    void fetchBookings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleBook = async () => {
    setSubmitting(true)
    try {
      const body = {
        userName: userName.trim(),
        userEmail: userEmail.trim(),
        userPhone: userPhone.trim(),
        coachId: selectedCoachId,
        preferredAt: preferredAt ? new Date(preferredAt).toISOString() : null,
        message: message.trim() ? message.trim() : null,
      }
      const res = await fetch('/api/coach/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 403) {
        onUpgrade()
        return
      }
      if (res.status === 409) {
        // e.g. single-active-booking rule
        const msg = data?.error || 'You already have an active booking.'
        showToast(String(msg), 'warning')
        await fetchBookings()
        return
      }
      if (!res.ok) throw new Error(data?.error || 'Failed to create booking')

      showToast('Booking request submitted. Coach has been notified by email.', 'success')
      setPreferredAt('')
      setMessage('')
      await fetchBookings()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      showToast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const cancelBooking = async (id: number) => {
    setMutatingBookingId(id)
    try {
      const res = await fetch(`/api/coach/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to cancel booking')
      showToast('Booking cancelled.', 'success')
      await fetchBookings()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      showToast(msg, 'error')
    } finally {
      setMutatingBookingId(null)
    }
  }

  const deleteBooking = async (id: number) => {
    const ok = window.confirm('Delete this booking from your history? This cannot be undone.')
    if (!ok) return
    setMutatingBookingId(id)
    try {
      const res = await fetch(`/api/coach/bookings/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to delete booking')
      showToast('Booking deleted.', 'success')
      await fetchBookings()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      showToast(msg, 'error')
    } finally {
      setMutatingBookingId(null)
    }
  }

  return (
    <div className="pb-24 px-4 pt-5 space-y-4 view-transition">
      <GlassCard className="p-4">
        <SectionHeader
          title="Personal Coach"
          subtitle="Premium (trial allowed) • Book a 1:1 coach call or message"
          right={
            <div className="text-[11px] text-amber-200 bg-amber-400/10 border border-amber-400/20 inline-flex px-2.5 py-1 rounded-full">
              Premium
            </div>
          }
        />

        {loadingCoach && !coach ? (
          <div className="mt-4 text-sm text-slate-300/70">Loading coach…</div>
        ) : coach ? (
          <div className="mt-4 space-y-3">
            {/* Marketplace coaches (approved) */}
            {coaches.length > 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-semibold text-white">Choose a coach</p>
                <p className="text-xs text-slate-300/70 mt-1">
                  These coaches signed up and were approved by admin. If you don’t select, default coach is used.
                </p>
                <div className="mt-3">
                  <select
                    value={selectedCoachId ?? ''}
                    onChange={(e) => setSelectedCoachId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-white/10 bg-transparent"
                  >
                    {coaches.map((c) => (
                      <option key={c.coach_id} value={c.coach_id} className="bg-slate-900">
                        {c.display_name}
                        {c.experience_years != null ? ` • ${c.experience_years}y` : ''}
                      </option>
                    ))}
                    <option value="" className="bg-slate-900">
                      Use default coach
                    </option>
                  </select>
                  {selectedCoachId ? (
                    <div className="mt-2 text-xs text-slate-200/80">
                      {(() => {
                        const c = coaches.find((x) => x.coach_id === selectedCoachId)
                        if (!c) return null
                        return (
                          <div className="space-y-1">
                            <div>
                              <span className="text-slate-300/70">Bio:</span> {c.bio || '—'}
                            </div>
                            <div>
                              <span className="text-slate-300/70">Certifications:</span> {c.certifications || '—'}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{coach.name}</p>
                  <p className="text-xs text-slate-300/70 mt-1">Personal Coach</p>
                </div>
                <div className="shrink-0 text-[11px] text-slate-200/80 glass-soft px-2.5 py-1 rounded-full border border-white/10">
                  Available
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  className="glass-soft rounded-xl px-3 py-2 border border-white/10 text-sm text-white/90 hover:bg-white/10 transition"
                  href={telHref}
                >
                  Call: <span className="text-slate-200">{coach.phone}</span>
                </a>
                <a
                  className="glass-soft rounded-xl px-3 py-2 border border-white/10 text-sm text-white/90 hover:bg-white/10 transition"
                  href={mailHref}
                >
                  Email: <span className="text-slate-200">{coach.email}</span>
                </a>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-sm font-semibold text-white">Request a session</p>
              <p className="text-xs text-slate-300/70 mt-1">
                Enter your contact info so the coach can reach you, plus your preferred time and goals.
              </p>
              {activeBooking ? (
                <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
                  <p className="text-xs text-amber-100">
                    You already have an active booking <span className="font-semibold">#{activeBooking.id}</span> (
                    {activeBooking.status}). Cancel it to book another coach.
                  </p>
                  {(() => {
                    const c = canCancelBooking(activeBooking)
                    return (
                      <div className="mt-2">
                        <AnimatedButton
                          type="button"
                          variant="secondary"
                          fullWidth
                          disabled={!c.ok || mutatingBookingId === activeBooking.id}
                          loading={mutatingBookingId === activeBooking.id}
                          onClick={() => cancelBooking(activeBooking.id)}
                        >
                          Cancel booking
                        </AnimatedButton>
                        {!c.ok && c.reason ? <div className="mt-2 text-[11px] text-amber-100/80">{c.reason}</div> : null}
                      </div>
                    )
                  })()}
                </div>
              ) : null}

              <div className="mt-3 space-y-2">
                <label className="block text-xs text-slate-300/70">Your name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Harshit"
                  disabled={Boolean(activeBooking)}
                  className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-400/30"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-300/70">Your email</label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="you@example.com"
                      disabled={Boolean(activeBooking)}
                      className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-400/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300/70">Your phone</label>
                    <input
                      type="tel"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      placeholder="9000000000"
                      disabled={Boolean(activeBooking)}
                      className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-400/30"
                    />
                  </div>
                </div>

                <label className="block text-xs text-slate-300/70">Preferred date & time</label>
                <input
                  type="datetime-local"
                  value={preferredAt}
                  onChange={(e) => setPreferredAt(e.target.value)}
                  disabled={Boolean(activeBooking)}
                  className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-400/30"
                />

                <label className="block text-xs text-slate-300/70 mt-2">Message (optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Example: Knee pain on squats, want form check + 4-week strength plan."
                  disabled={Boolean(activeBooking)}
                  className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-400/30 resize-none"
                />

                <div className="pt-2">
                  <AnimatedButton
                    onClick={handleBook}
                    disabled={Boolean(activeBooking) || submitting || !userName.trim() || !userEmail.trim() || !userPhone.trim()}
                    loading={submitting}
                    variant="primary"
                    fullWidth
                  >
                    Submit booking request
                  </AnimatedButton>
                  {!activeBooking && (!userName.trim() || !userEmail.trim() || !userPhone.trim()) ? (
                    <p className="mt-2 text-xs text-slate-300/70">
                      Please enter your name, email and phone so the coach can contact you.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 text-sm text-slate-300/70">Coach unavailable right now.</div>
        )}
      </GlassCard>

      <GlassCard className="p-4">
        <SectionHeader
          title="Your bookings"
          subtitle="Status and schedule for your account only"
          right={
            <button
              onClick={() => void fetchBookings()}
              className="text-xs text-slate-200/80 hover:text-white glass-soft px-2.5 py-1 rounded-full border border-white/10"
              disabled={loadingBookings}
            >
              {loadingBookings ? 'Refreshing…' : 'Refresh'}
            </button>
          }
        />

        {loadingBookings && bookings.length === 0 ? (
          <div className="mt-4 text-sm text-slate-300/70">Loading…</div>
        ) : bookings.length === 0 ? (
          <div className="mt-4 text-sm text-slate-300/70">No requests yet.</div>
        ) : (
          <div className="mt-3 space-y-2">
            {bookings.map((b) => (
              <div key={b.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {b.coach_name} <span className="text-slate-300/70 font-normal">• #{b.id}</span>
                    </p>
                    <p className="text-xs text-slate-300/70 mt-1">
                      Preferred:{' '}
                      {b.preferred_at ? new Date(b.preferred_at).toLocaleString() : 'Not specified'}
                    </p>
                    {b.message ? (
                      <p className="text-xs text-slate-200/80 mt-2 whitespace-pre-wrap">{b.message}</p>
                    ) : null}
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      {(() => {
                        const c = canCancelBooking(b)
                        if (c.ok) {
                          return (
                            <AnimatedButton
                              type="button"
                              variant="secondary"
                              size="sm"
                              fullWidth
                              disabled={mutatingBookingId === b.id}
                              loading={mutatingBookingId === b.id}
                              onClick={() => cancelBooking(b.id)}
                            >
                              Cancel
                            </AnimatedButton>
                          )
                        }
                        return null
                      })()}
                      {canDeleteBooking(b) ? (
                        <AnimatedButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          fullWidth
                          disabled={mutatingBookingId === b.id}
                          loading={mutatingBookingId === b.id}
                          onClick={() => deleteBooking(b.id)}
                        >
                          Delete
                        </AnimatedButton>
                      ) : null}
                    </div>
                    {(() => {
                      const c = canCancelBooking(b)
                      return !c.ok && c.reason ? (
                        <div className="mt-2 text-[11px] text-amber-200/90">{c.reason}</div>
                      ) : null
                    })()}
                  </div>
                  <div className="shrink-0 text-[11px] text-slate-200/80 glass-soft px-2.5 py-1 rounded-full border border-white/10">
                    {b.status}
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-300/60">
                  Created: {new Date(b.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  )
}

