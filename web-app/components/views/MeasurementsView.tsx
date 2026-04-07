'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, TrendingDown, TrendingUp, Minus, Scale, Ruler } from 'lucide-react'
import { GlassCard } from '../ui/GlassCard'
import { SectionHeader } from '../ui/SectionHeader'
import { AnimatedButton } from '../ui/AnimatedButton'
import { csrfFetch } from '@/lib/useCsrf'
import { toast } from 'sonner'

interface Measurement {
  id: number
  measured_at: string
  weight: number | null
  waist: number | null
  chest: number | null
  arms: number | null
  hips: number | null
  notes: string | null
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

function TrendChart({ data, label, unit, color }: { data: { date: string; value: number }[]; label: string; unit: string; color: string }) {
  if (data.length < 2) return null

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
  const values = sorted.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const width = 300
  const height = 80
  const padding = 8

  const points = sorted.map((d, i) => {
    const x = padding + (i / (sorted.length - 1)) * (width - padding * 2)
    const y = height - padding - ((d.value - min) / range) * (height - padding * 2)
    return `${x},${y}`
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p}`).join(' ')
  const areaD = `${pathD} L ${padding + ((sorted.length - 1) / (sorted.length - 1)) * (width - padding * 2)},${height - padding} L ${padding},${height - padding} Z`

  const first = values[0]
  const last = values[values.length - 1]
  const diff = last - first
  const TrendIcon = diff < 0 ? TrendingDown : diff > 0 ? TrendingUp : Minus

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-primary-lighter">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-white">{last.toFixed(1)} {unit}</span>
          {diff !== 0 && (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${
              diff < 0 ? 'text-green-400' : 'text-orange-400'
            }`}>
              <TrendIcon className="w-3 h-3" />
              {Math.abs(diff).toFixed(1)}
            </span>
          )}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20">
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#grad-${label})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {sorted.map((d, i) => {
          const x = padding + (i / (sorted.length - 1)) * (width - padding * 2)
          const y = height - padding - ((d.value - min) / range) * (height - padding * 2)
          return <circle key={i} cx={x} cy={y} r="3" fill={color} stroke="var(--navy-0)" strokeWidth="1.5" />
        })}
      </svg>
      <div className="flex justify-between text-xs text-muted">
        <span>{sorted[0].date.slice(5)}</span>
        <span>{sorted[sorted.length - 1].date.slice(5)}</span>
      </div>
    </div>
  )
}

export function MeasurementsView() {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [measuredAt, setMeasuredAt] = useState(new Date().toISOString().slice(0, 10))
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')
  const [chest, setChest] = useState('')
  const [arms, setArms] = useState('')
  const [hips, setHips] = useState('')
  const [notes, setNotes] = useState('')

  const fetchMeasurements = async () => {
    try {
      const res = await csrfFetch('/api/measurements')
      if (res.ok) {
        const data = await res.json()
        setMeasurements(data.measurements || [])
      }
    } catch (err) {
      console.error('Error fetching measurements:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMeasurements() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const body: Record<string, unknown> = { measured_at: measuredAt }
    if (weight) body.weight = parseFloat(weight)
    if (waist) body.waist = parseFloat(waist)
    if (chest) body.chest = parseFloat(chest)
    if (arms) body.arms = parseFloat(arms)
    if (hips) body.hips = parseFloat(hips)
    if (notes.trim()) body.notes = notes.trim()

    try {
      const res = await csrfFetch('/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast.success('Measurement saved!')
        setShowForm(false)
        setWeight(''); setWaist(''); setChest(''); setArms(''); setHips(''); setNotes('')
        setMeasuredAt(new Date().toISOString().slice(0, 10))
        fetchMeasurements()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to save')
      }
    } catch {
      toast.error('Failed to save measurement')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await csrfFetch(`/api/measurements?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Measurement deleted')
        setMeasurements((prev) => prev.filter((m) => m.id !== id))
      }
    } catch {
      toast.error('Failed to delete')
    }
  }

  // Prepare chart data
  const chartData = useMemo(() => {
    const sorted = [...measurements].sort((a, b) => a.measured_at.localeCompare(b.measured_at))
    return {
      weight: sorted.filter((m) => m.weight != null).map((m) => ({ date: m.measured_at, value: m.weight! })),
      waist: sorted.filter((m) => m.waist != null).map((m) => ({ date: m.measured_at, value: m.waist! })),
      chest: sorted.filter((m) => m.chest != null).map((m) => ({ date: m.measured_at, value: m.chest! })),
      arms: sorted.filter((m) => m.arms != null).map((m) => ({ date: m.measured_at, value: m.arms! })),
      hips: sorted.filter((m) => m.hips != null).map((m) => ({ date: m.measured_at, value: m.hips! })),
    }
  }, [measurements])

  const hasCharts = chartData.weight.length >= 2 || chartData.waist.length >= 2

  return (
    <motion.div
      className="pb-24 px-4 pt-5 space-y-4"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between pt-10">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-white font-[family-name:var(--font-display)]">
            Body Tracker
          </h1>
          <p className="text-xs text-muted mt-1">Log weight & measurements to track your transformation</p>
        </div>
        <AnimatedButton
          onClick={() => setShowForm(!showForm)}
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
        >
          Log
        </AnimatedButton>
      </motion.div>

      {/* Add Measurement Form */}
      {showForm && (
        <motion.div variants={fadeUp}>
          <GlassCard className="p-4">
            <SectionHeader title="New Entry" subtitle="Record today's measurements" />
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-muted mb-1 block">Date</label>
                <input
                  type="date"
                  value={measuredAt}
                  onChange={(e) => setMeasuredAt(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1 flex items-center gap-1"><Scale className="w-3 h-3" /> Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="72.5"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 flex items-center gap-1"><Ruler className="w-3 h-3" /> Waist (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={waist}
                    onChange={(e) => setWaist(e.target.value)}
                    placeholder="80.0"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">Chest (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={chest}
                    onChange={(e) => setChest(e.target.value)}
                    placeholder="96.0"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">Arms (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={arms}
                    onChange={(e) => setArms(e.target.value)}
                    placeholder="35.0"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted mb-1 block">Hips (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={hips}
                  onChange={(e) => setHips(e.target.value)}
                  placeholder="95.0"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-muted mb-1 block">Notes (optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Morning weigh-in, fasted..."
                  maxLength={500}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <AnimatedButton
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={saving}
                  disabled={saving || (!weight && !waist && !chest && !arms && !hips)}
                >
                  {saving ? 'Saving...' : 'Save Entry'}
                </AnimatedButton>
                <AnimatedButton
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </AnimatedButton>
              </div>
            </form>
          </GlassCard>
        </motion.div>
      )}

      {/* Trend Charts */}
      {hasCharts && (
        <motion.div variants={fadeUp}>
          <GlassCard className="p-4 space-y-5">
            <SectionHeader title="Trends" subtitle="Your progress over time" />
            {chartData.weight.length >= 2 && (
              <TrendChart data={chartData.weight} label="Weight" unit="kg" color="var(--primary)" />
            )}
            {chartData.waist.length >= 2 && (
              <TrendChart data={chartData.waist} label="Waist" unit="cm" color="var(--cyan)" />
            )}
            {chartData.chest.length >= 2 && (
              <TrendChart data={chartData.chest} label="Chest" unit="cm" color="var(--gold)" />
            )}
            {chartData.arms.length >= 2 && (
              <TrendChart data={chartData.arms} label="Arms" unit="cm" color="var(--accent)" />
            )}
            {chartData.hips.length >= 2 && (
              <TrendChart data={chartData.hips} label="Hips" unit="cm" color="#EC4899" />
            )}
          </GlassCard>
        </motion.div>
      )}

      {/* History */}
      <motion.div variants={fadeUp}>
        <GlassCard className="p-4">
          <SectionHeader title="History" subtitle={`${measurements.length} entries logged`} />

          {loading && (
            <div className="py-8 text-center text-sm text-muted">Loading...</div>
          )}

          {!loading && measurements.length === 0 && (
            <div className="py-12 text-center">
              <Scale className="w-10 h-10 text-primary/30 mx-auto mb-3" />
              <p className="text-sm text-muted">No measurements yet</p>
              <p className="text-xs text-muted mt-1">Tap &ldquo;Log&rdquo; to record your first entry</p>
            </div>
          )}

          {!loading && measurements.length > 0 && (
            <div className="mt-3 space-y-2">
              {measurements.slice(0, 20).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/3 border border-white/5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-primary-lighter">{m.measured_at}</span>
                      {m.weight != null && (
                        <span className="text-xs text-white/80">{m.weight} kg</span>
                      )}
                      {m.waist != null && (
                        <span className="text-xs text-muted">W: {m.waist}</span>
                      )}
                      {m.chest != null && (
                        <span className="text-xs text-muted">C: {m.chest}</span>
                      )}
                      {m.arms != null && (
                        <span className="text-xs text-muted">A: {m.arms}</span>
                      )}
                      {m.hips != null && (
                        <span className="text-xs text-muted">H: {m.hips}</span>
                      )}
                    </div>
                    {m.notes && (
                      <p className="text-xs text-muted mt-0.5 truncate">{m.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-red-500/15 text-muted hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </motion.div>
    </motion.div>
  )
}
