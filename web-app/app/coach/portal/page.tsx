'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { AnimatedButton } from '@/components/ui/AnimatedButton'

export default function CoachPortalPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [error, setError] = useState<string>('')

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [experienceYears, setExperienceYears] = useState<number | ''>('')
  const [certifications, setCertifications] = useState('')
  const [specialties, setSpecialties] = useState('')
  const [languages, setLanguages] = useState('')
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const fetchMe = async () => {
    try {
      const res = await fetch('/api/coach/me', { cache: 'no-store' })
      if (res.status === 401) {
        router.push('/login')
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!data?.application) {
        setStatus('')
        return
      }
      setStatus(String(data.application.status || 'pending'))
      setNotes(String(data.application.admin_notes || ''))
      if (data?.profile?.display_name) setDisplayName(String(data.profile.display_name))
      if (data?.profile?.bio) setBio(String(data.profile.bio))
      if (data?.profile?.experience_years != null) setExperienceYears(Number(data.profile.experience_years))
      if (data?.profile?.certifications) setCertifications(String(data.profile.certifications))
      if (Array.isArray(data?.profile?.specialties)) setSpecialties(data.profile.specialties.join(', '))
      if (Array.isArray(data?.profile?.languages)) setLanguages(data.profile.languages.join(', '))
      if (data?.profile?.timezone) setTimezone(String(data.profile.timezone))
      if (data?.profile?.phone) setPhone(String(data.profile.phone))
      if (data?.profile?.email) setEmail(String(data.profile.email))
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    void fetchMe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async () => {
    setLoading(true)
    setError('')
    try {
      const payload = {
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        experience_years: experienceYears === '' ? null : experienceYears,
        certifications: certifications.trim() || null,
        specialties: specialties.trim() ? specialties.split(',').map((s) => s.trim()).filter(Boolean) : null,
        languages: languages.trim() ? languages.split(',').map((s) => s.trim()).filter(Boolean) : null,
        timezone: timezone.trim() || 'Asia/Kolkata',
        phone: phone.trim() || null,
        email: email.trim() || null,
      }
      const res = await fetch('/api/coach/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to save profile')
      await fetchMe()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-screen-md mx-auto pb-24 px-4 pt-6 space-y-4">
        <GlassCard className="p-4">
          <SectionHeader title="Coach portal" subtitle="Edit your coach profile" />
          {!status ? (
            <div className="mt-3 text-sm text-slate-300/70">
              You haven’t applied as a coach yet.
              <div className="mt-3">
                <AnimatedButton type="button" variant="primary" fullWidth onClick={() => router.push('/coach/apply')}>
                  Apply as coach
                </AnimatedButton>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm text-slate-200/80">
              Status: <span className="font-semibold text-white">{status}</span>
              {notes ? <div className="mt-2 text-xs text-amber-200/90">Admin notes: {notes}</div> : null}
            </div>
          )}
          {error ? <div className="mt-3 text-sm text-red-200">{error}</div> : null}
        </GlassCard>

        {status ? (
          <GlassCard className="p-4">
            <SectionHeader title="Profile" subtitle="Users see this in coach listing" />
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs text-slate-300/70 mb-2">Display name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-white/10"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300/70 mb-2">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-white/10 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300/70 mb-2">Experience (years)</label>
                  <input
                    type="number"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300/70 mb-2">Timezone</label>
                  <input
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-white/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300/70 mb-2">Certifications</label>
                <textarea
                  value={certifications}
                  onChange={(e) => setCertifications(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-white/10 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300/70 mb-2">Specialties (comma-separated)</label>
                  <input
                    value={specialties}
                    onChange={(e) => setSpecialties(e.target.value)}
                    className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300/70 mb-2">Languages (comma-separated)</label>
                  <input
                    value={languages}
                    onChange={(e) => setLanguages(e.target.value)}
                    className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-white/10"
                  />
                </div>
              </div>

              <SectionHeader title="Contact" subtitle="Needed to receive booking emails" className="pt-2" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300/70 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300/70 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 glass-soft rounded-2xl text-white ui-focus-ring border border-white/10"
                  />
                </div>
              </div>

              <div className="pt-2">
                <AnimatedButton
                  type="button"
                  variant="primary"
                  fullWidth
                  loading={loading}
                  disabled={loading || !displayName.trim() || !email.trim()}
                  onClick={save}
                >
                  Save changes
                </AnimatedButton>
                <div className="mt-2 flex gap-2">
                  <AnimatedButton type="button" variant="ghost" fullWidth onClick={() => router.push('/dashboard')}>
                    Back to Dashboard
                  </AnimatedButton>
                  <AnimatedButton type="button" variant="secondary" fullWidth onClick={() => router.push('/admin/coach-approvals')}>
                    Admin approvals
                  </AnimatedButton>
                </div>
              </div>
            </div>
          </GlassCard>
        ) : null}
      </div>
    </div>
  )
}

