'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Globe, Plus, LogOut, Copy, Check, Trophy, Flame, Star, Sparkles, X } from 'lucide-react'
import { GlassCard } from '../ui/GlassCard'
import { SectionHeader } from '../ui/SectionHeader'
import { AnimatedButton } from '../ui/AnimatedButton'
import { csrfFetch } from '@/lib/useCsrf'

type Community = {
  id: number
  name: string
  description: string | null
  type: 'custom' | 'worldwide'
  region: 'APAC' | 'EMEA' | 'NA' | 'LATAM' | null
  join_code: string | null
  created_by: number | null
  member_count: number
  member_cap: number | null
  created_at: string
}

type Member = {
  user_id: number
  username: string
  total_xp: number
  current_streak: number
  nationality: string | null
  joined_at: string
}

const COUNTRY_FLAGS: Record<string, string> = {
  IN: '🇮🇳', US: '🇺🇸', GB: '🇬🇧', CA: '🇨🇦', AU: '🇦🇺', DE: '🇩🇪', FR: '🇫🇷',
  JP: '🇯🇵', BR: '🇧🇷', MX: '🇲🇽', CN: '🇨🇳', KR: '🇰🇷', TH: '🇹🇭', SG: '🇸🇬',
  AE: '🇦🇪', SA: '🇸🇦', PK: '🇵🇰', BD: '🇧🇩', ID: '🇮🇩', PH: '🇵🇭', VN: '🇻🇳',
  MY: '🇲🇾', NZ: '🇳🇿', IT: '🇮🇹', ES: '🇪🇸', NL: '🇳🇱', SE: '🇸🇪', NO: '🇳🇴',
  PL: '🇵🇱', TR: '🇹🇷', EG: '🇪🇬', ZA: '🇿🇦', NG: '🇳🇬', AR: '🇦🇷', CO: '🇨🇴',
  CL: '🇨🇱', IL: '🇮🇱', IE: '🇮🇪', CH: '🇨🇭', RU: '🇷🇺',
}

function flagFor(code: string | null): string {
  if (!code) return '🌍'
  return COUNTRY_FLAGS[code.toUpperCase()] ?? '🌍'
}

function fmtXp(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

interface CommunitiesViewProps {
  currentUserId?: number
}

export function CommunitiesView({ currentUserId }: CommunitiesViewProps) {
  const [loading, setLoading] = useState(true)
  const [community, setCommunity] = useState<Community | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [cooldownExpiresAt, setCooldownExpiresAt] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const loadMine = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await csrfFetch('/api/communities/me')
      const data = res.ok ? await res.json() : { community: null, cooldown_expires_at: null }
      setCommunity(data.community ?? null)
      setCooldownExpiresAt(data.cooldown_expires_at ?? null)

      if (data.community) {
        const lbRes = await csrfFetch(`/api/communities/${data.community.id}`)
        if (lbRes.ok) {
          const lbData = await lbRes.json()
          setMembers(lbData.members || [])
        }
      } else {
        setMembers([])
      }
    } catch {
      setCommunity(null)
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMine() }, [loadMine])

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return
    setBusy(true); setError('')
    try {
      const res = await csrfFetch('/api/communities/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to join')
      setShowJoinModal(false); setJoinCode('')
      setSuccess('Joined community!')
      await loadMine()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join')
    } finally {
      setBusy(false)
    }
  }

  const handleJoinWorldwide = async () => {
    setBusy(true); setError('')
    try {
      const res = await csrfFetch('/api/communities/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worldwide: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to join')
      setSuccess('Joined regional community!')
      await loadMine()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join')
    } finally {
      setBusy(false)
    }
  }

  const handleCreate = async () => {
    if (createName.trim().length < 3) {
      setError('Name must be at least 3 characters')
      return
    }
    setBusy(true); setError('')
    try {
      const res = await csrfFetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName.trim(), description: createDesc.trim() || null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to create')
      setShowCreateModal(false); setCreateName(''); setCreateDesc('')
      setSuccess('Community created!')
      await loadMine()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create')
    } finally {
      setBusy(false)
    }
  }

  const handleLeave = async () => {
    if (!confirm('Leave this community? You must wait 6 hours before joining a new one.')) return
    setBusy(true); setError('')
    try {
      const res = await csrfFetch('/api/communities/leave', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to leave')
      setSuccess('Left community')
      await loadMine()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to leave')
    } finally {
      setBusy(false)
    }
  }

  const copyCode = () => {
    if (!community?.join_code) return
    navigator.clipboard.writeText(community.join_code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (loading) {
    return (
      <div className="px-4 pt-6 pb-24 max-w-md mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded-2xl bg-white/5" />
          <div className="h-64 rounded-2xl bg-white/5" />
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-24 max-w-md mx-auto">
      <SectionHeader
        title="Communities"
        subtitle={community ? 'Compete on the leaderboard' : 'Join your tribe'}
        right={<Users className="w-5 h-5 text-primary-light" />}
      />

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200 text-sm"
          >
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onAnimationComplete={() => setTimeout(() => setSuccess(''), 2500)}
            className="mt-3 mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200 text-sm"
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No community — show join/create options */}
      {!community && (
        <div className="space-y-4 mt-4">
          <GlassCard className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/20">
                <Globe className="w-5 h-5 text-primary-light" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white mb-1">Worldwide community</p>
                <p className="text-xs text-muted mb-3">Join everyone in your region (APAC / EMEA / NA / LATAM) auto-detected from your country.</p>
                <AnimatedButton
                  variant="primary"
                  fullWidth
                  loading={busy}
                  onClick={handleJoinWorldwide}
                  className="!rounded-xl"
                >
                  Join my region
                </AnimatedButton>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-brand-cyan/15 border border-brand-cyan/20">
                <Users className="w-5 h-5 text-brand-cyan-light" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white mb-1">Custom community</p>
                <p className="text-xs text-muted mb-3">Join with a code, or create a new one (max 100 members).</p>
                <div className="grid grid-cols-2 gap-2">
                  <AnimatedButton variant="secondary" fullWidth onClick={() => setShowJoinModal(true)} className="!rounded-xl">Join by code</AnimatedButton>
                  <AnimatedButton variant="coral" fullWidth onClick={() => setShowCreateModal(true)} className="!rounded-xl">Create</AnimatedButton>
                </div>
              </div>
            </div>
          </GlassCard>

          {cooldownExpiresAt && new Date(cooldownExpiresAt) > new Date() && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-200 text-xs">
              Cooldown active. You can join a new community after {new Date(cooldownExpiresAt).toLocaleString()}.
            </div>
          )}
        </div>
      )}

      {/* In a community — show leaderboard */}
      {community && (
        <div className="space-y-4 mt-4">
          <GlassCard className="p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {community.type === 'worldwide' ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary-light border border-primary/30">{community.region}</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-cyan/15 text-brand-cyan-light border border-brand-cyan/30">Custom</span>
                  )}
                  <span className="text-xs text-muted">
                    {community.member_count}{community.member_cap ? ` / ${community.member_cap}` : ''} members
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white truncate">{community.name}</h2>
                {community.description && <p className="text-xs text-muted mt-1">{community.description}</p>}
              </div>
              <button
                onClick={handleLeave}
                disabled={busy}
                title="Leave community"
                className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {community.join_code && (
              <button
                onClick={copyCode}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/5 border border-primary/20 hover:bg-white/8 transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">Invite code</span>
                  <span className="font-mono font-bold tracking-wider text-primary-light">{community.join_code}</span>
                </div>
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-muted" />}
              </button>
            )}
          </GlassCard>

          {/* Leaderboard */}
          <GlassCard className="p-0 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
              <Trophy className="w-4 h-4 text-amber-300" />
              <p className="text-sm font-semibold text-white">Leaderboard</p>
              <span className="ml-auto text-xs text-muted">Top {members.length}</span>
            </div>
            {members.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted">No members yet</div>
            ) : (
              <ul className="divide-y divide-white/5">
                {members.map((m, i) => {
                  const isMe = currentUserId && m.user_id === currentUserId
                  const rankBadge =
                    i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`
                  return (
                    <li
                      key={m.user_id}
                      className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-primary/10' : ''}`}
                    >
                      <div className={`w-8 text-center text-sm ${i < 3 ? 'text-base' : 'font-mono text-muted'}`}>
                        {rankBadge}
                      </div>
                      <div className="text-xl">{flagFor(m.nationality)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isMe ? 'text-primary-light' : 'text-white'}`}>
                          {m.username}{isMe && <span className="ml-1 text-xs text-muted">(you)</span>}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted">
                          <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-amber-400" />{m.current_streak}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-sm font-bold text-white">
                        <Star className="w-3.5 h-3.5 text-amber-300" />
                        {fmtXp(m.total_xp)}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </GlassCard>
        </div>
      )}

      {/* Join modal */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => !busy && setShowJoinModal(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-navy-0 border border-primary/20 p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-white">Join with code</h3>
                <button onClick={() => setShowJoinModal(false)} className="p-1 text-muted hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. A4F2X9KM"
                maxLength={16}
                autoFocus
                className="w-full px-3 py-3 rounded-xl bg-white/5 border border-primary/20 text-white text-lg font-mono tracking-wider text-center focus:outline-none focus:border-primary/50"
              />
              <AnimatedButton
                variant="primary"
                fullWidth
                loading={busy}
                disabled={!joinCode.trim() || busy}
                onClick={handleJoinByCode}
                className="!rounded-xl mt-4"
              >
                Join
              </AnimatedButton>
            </motion.div>
          </motion.div>
        )}

        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => !busy && setShowCreateModal(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-navy-0 border border-primary/20 p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary-light" />Create community</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 text-muted hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted">Name</label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. Mumbai Lifters"
                    maxLength={80}
                    autoFocus
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-white/5 border border-primary/20 text-white focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted">Description (optional)</label>
                  <textarea
                    value={createDesc}
                    onChange={(e) => setCreateDesc(e.target.value)}
                    placeholder="What's this community about?"
                    maxLength={500}
                    rows={3}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-white/5 border border-primary/20 text-white text-sm focus:outline-none focus:border-primary/50 resize-none"
                  />
                </div>
              </div>
              <AnimatedButton
                variant="coral"
                fullWidth
                loading={busy}
                disabled={createName.trim().length < 3 || busy}
                onClick={handleCreate}
                className="!rounded-xl mt-4"
                icon={<Plus className="w-4 h-4" />}
              >
                Create
              </AnimatedButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
