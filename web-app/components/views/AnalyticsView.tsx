'use client'

import { PremiumStatus } from '@/types'

interface AnalyticsViewProps {
  premiumStatus: PremiumStatus
  onUpgrade: () => void
}

export function AnalyticsView({ premiumStatus, onUpgrade }: AnalyticsViewProps) {
  if (!premiumStatus.access) {
    const trialEndedText =
      premiumStatus.trial_end ? new Date(premiumStatus.trial_end).toLocaleString() : null
    return (
      <div className="pb-24 px-4 py-6">
        <div className="glass rounded-2xl p-8 border border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Analytics (Pro)</h2>
              <p className="text-slate-300/70 text-sm leading-relaxed">
                {trialEndedText
                  ? `Your free trial ended on ${trialEndedText}. Upgrade to unlock your progress dashboard: workout history, completion trends, and consistency insights.`
                  : 'Upgrade to unlock your progress dashboard: workout history, completion trends, and consistency insights.'}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-400/10 text-amber-200 border border-amber-400/20">
              Premium
            </span>
          </div>

          <div className="mt-6 grid gap-3">
            {[
              'History of your last ~10 workouts',
              'Completion % by day and week',
              'Streaks and consistency calendar',
              'Most skipped exercises',
            ].map((t) => (
              <div key={t} className="glass-soft rounded-xl p-3 text-sm text-slate-200/85 border border-white/10">
                {t}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onUpgrade}
              className="px-5 py-3 rounded-2xl font-semibold text-sm bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition"
            >
              Upgrade for ₹1/month
            </button>
            <div className="text-xs text-slate-300/60 self-center">
              Status: {premiumStatus.status ?? 'not subscribed'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isTrial = !premiumStatus.premium && premiumStatus.trial_active
  const trialEndsText =
    premiumStatus.trial_end ? new Date(premiumStatus.trial_end).toLocaleString() : null

  return (
    <div className="pb-24 px-4 py-6">
      <div className="glass rounded-2xl p-8 border border-white/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Analytics</h2>
            <p className="text-slate-300/70 text-sm leading-relaxed">
              {isTrial
                ? 'Your free trial is active. Your analytics will appear here. (Next: charts + history panels.)'
                : 'Your Pro analytics will appear here. (Next: charts + history panels.)'}
            </p>
          </div>
          {isTrial ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-400/10 text-cyan-200 border border-cyan-400/20">
              Trial Active
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-400/10 text-emerald-200 border border-emerald-400/20">
              Pro Active
            </span>
          )}
        </div>

        <div className="mt-6 grid gap-3">
          <div className="glass-soft rounded-xl p-4 border border-white/10">
            <div className="text-sm font-semibold text-white">{isTrial ? 'Trial' : 'Subscription'}</div>
            <div className="text-xs text-slate-300/70 mt-1">
              Status: {premiumStatus.status ?? 'unknown'}
            </div>
            {isTrial && trialEndsText && (
              <div className="text-xs text-slate-300/70 mt-1">
                Trial ends: {trialEndsText}
              </div>
            )}
            {premiumStatus.current_end && (
              <div className="text-xs text-slate-300/70 mt-1">
                Current period ends: {new Date(premiumStatus.current_end).toLocaleString()}
              </div>
            )}
          </div>

          <div className="glass-soft rounded-xl p-4 border border-white/10 text-sm text-slate-200/85">
            Coming next: completion trends, streak calendar, and workout history charts.
          </div>
        </div>
      </div>
    </div>
  )
}

