'use client'

import { useMemo, useState } from 'react'
import { PremiumStatus } from '@/types'

type RazorpayCheckout = {
  open: () => void
}

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayCheckout

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor
  }
}

async function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (window.Razorpay) return true

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay')))
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Razorpay'))
    document.body.appendChild(script)
  })

  return Boolean(window.Razorpay)
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms))
}

interface UpgradeModalProps {
  open: boolean
  status: PremiumStatus | null
  onClose: () => void
  onUnlocked: (status: PremiumStatus) => void
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
}

export function UpgradeModal({ open, status, onClose, onUnlocked, showToast }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false)
  const [polling, setPolling] = useState(false)

  const canClose = !loading && !polling

  const headline = useMemo(() => {
    if (!status?.status) return 'Upgrade to Pro Analytics'
    if (status.premium) return 'Pro is already active'
    return `Subscription status: ${status.status}`
  }, [status])

  const startPollingUntilUnlocked = async () => {
    setPolling(true)
    try {
      const start = Date.now()
      while (Date.now() - start < 90_000) {
        const res = await fetch('/api/billing/status', { cache: 'no-store' })
        if (res.ok) {
          const next = (await res.json()) as PremiumStatus
          if (next.premium) {
            showToast('Pro unlocked! Analytics is now available.', 'success')
            onUnlocked(next)
            return
          }
        }
        await sleep(2000)
      }
      showToast('Payment received, but activation is taking longer. Please wait a bit and retry.', 'warning')
    } finally {
      setPolling(false)
    }
  }

  const handlePay = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: 'analytics_pro', billing: 'monthly' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to create subscription')

      const ok = await loadRazorpayScript()
      if (!ok) throw new Error('Razorpay checkout failed to load')

      const RazorpayCtor = window.Razorpay
      if (!RazorpayCtor) throw new Error('Razorpay checkout is unavailable')

      const rz = new RazorpayCtor({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: 'GymBro AI',
        description: 'Pro Analytics (₹1/month)',
        theme: { color: '#F59E0B' },
        // Try to force UPI if available for this subscription/account
        config: {
          display: {
            blocks: {
              methods: {
                name: 'Payment Methods',
                instruments: [
                  { method: 'upi' },
                  { method: 'card' }
                ],
              },
            },
            sequence: ['block.methods'],
            preferences: {
              show_default_blocks: true,
            },
          },
        },
        prefill: {
          name: '', // User can fill or we can pull from profile
          email: '',
          contact: ''
        },
        modal: {
          ondismiss: () => {
            // No-op: user may close checkout; keep modal open
          },
        },
        handler: () => {
          showToast('Payment initiated. Unlocking Pro…', 'info')
          startPollingUntilUnlocked()
        },
      })

      rz.open()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/10">
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-[#FBBF24] bg-[#F59E0B]/15 border border-[#F59E0B]/30 inline-flex px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                ✨ Premium
              </div>
              <h3 className="text-xl font-bold text-white mt-3">{headline}</h3>
              <p className="text-sm text-slate-300/70 mt-2">
                Subscribe for <span className="text-white font-semibold">₹1/month</span> to unlock Analytics Pro.
              </p>
            </div>
            <button
              onClick={canClose ? onClose : undefined}
              className={`p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition ${canClose ? '' : 'opacity-50 cursor-not-allowed'
                }`}
              aria-label="Close"
              disabled={!canClose}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-5 grid gap-2">
            {[
              'Workout history (last ~10)',
              'Completion trends (day/week)',
              'Streaks + consistency insights',
              'Skipped exercise insights',
            ].map((t) => (
              <div key={t} className="glass-soft rounded-xl p-3 text-sm text-slate-200/85 border border-white/10">
                {t}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handlePay}
              disabled={loading || polling}
              className={`px-5 py-3 rounded-2xl font-semibold text-sm shadow-lg transition active:scale-[0.99] ${loading || polling
                  ? 'bg-slate-700 text-slate-200 cursor-wait'
                  : 'bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-slate-900 shadow-[0_0_25px_rgba(245,158,11,0.3)] hover:shadow-[0_0_35px_rgba(245,158,11,0.4)]'
                }`}
            >
              {polling ? 'Activating…' : loading ? 'Opening payment…' : 'Pay ₹1/month'}
            </button>
            <button
              onClick={canClose ? onClose : undefined}
              disabled={!canClose}
              className="px-5 py-3 rounded-2xl font-medium text-sm text-slate-300 hover:text-white hover:bg-white/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Not now
            </button>
          </div>

          <div className="mt-4 text-[11px] text-slate-400/80 leading-relaxed">
            Payments are processed securely by Razorpay. Pro unlock is confirmed via server verification (webhook).
          </div>
        </div>
      </div>
    </div>
  )
}

