'use client'

import { useEffect, useMemo, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { AnimatedButton } from '@/components/ui/AnimatedButton'

type Coach = {
  id: string
  name: string
  phone: string
  email: string
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

  const [preferredAt, setPreferredAt] = useState<string>('')
  const [message, setMessage] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const [bookings, setBookings] = useState<CoachBooking[]>([])
  const [loadingBookings, setLoadingBookings] = useState(false)

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

  const fetchBookings = async () => {
    setLoadingBookings(true)
    try {
      const res = await fetch('/api/coach/bookings?limit=10', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.status === 403) return
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
    void fetchBookings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleBook = async () => {
    setSubmitting(true)
    try {
      const body = {
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
      if (!res.ok) throw new Error(data?.error || 'Failed to create booking')

      showToast('Booking request submitted. We will contact you soon.', 'success')
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
                Share your preferred time and what you want to work on. We’ll contact you on your registered details.
              </p>

              <div className="mt-3 space-y-2">
                <label className="block text-xs text-slate-300/70">Preferred date & time</label>
                <input
                  type="datetime-local"
                  value={preferredAt}
                  onChange={(e) => setPreferredAt(e.target.value)}
                  className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-400/30"
                />

                <label className="block text-xs text-slate-300/70 mt-2">Message (optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Example: Knee pain on squats, want form check + 4-week strength plan."
                  className="w-full rounded-xl bg-slate-900/60 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-400/30 resize-none"
                />

                <div className="pt-2">
                  <AnimatedButton
                    onClick={handleBook}
                    disabled={submitting}
                    loading={submitting}
                    variant="primary"
                    fullWidth
                  >
                    Submit booking request
                  </AnimatedButton>
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
          title="Your recent requests"
          subtitle="Latest 10 booking requests"
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

