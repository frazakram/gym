'use client'

import type { GymEquipmentAnalysis } from '@/types'

interface EquipmentSummaryProps {
  analysis: GymEquipmentAnalysis
}

export function EquipmentSummary({ analysis }: EquipmentSummaryProps) {
  const { equipment_detected, gym_type, space_assessment, unique_features, limitations, confidence_score } = analysis

  return (
    <div className="mt-4 glass-soft rounded-2xl border border-white/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">Detected Equipment</h4>
        <span className="text-xs text-slate-300/70">
          {Math.round(confidence_score * 100)}% confidence
        </span>
      </div>

      {/* Equipment List */}
      <div className="flex flex-wrap gap-2">
        {equipment_detected.map((item) => (
          <span
            key={item}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs font-medium"
          >
            {item}
          </span>
        ))}
      </div>

      {/* Gym Details */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div>
          <p className="text-xs text-slate-400 mb-1">Gym Type</p>
          <p className="text-sm font-medium text-white capitalize">{gym_type}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Space</p>
          <p className="text-sm font-medium text-white capitalize">{space_assessment}</p>
        </div>
      </div>

      {/* Unique Features */}
      {unique_features && unique_features.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 mb-2">Special Equipment</p>
          <div className="flex flex-wrap gap-2">
            {unique_features.map((feature) => (
              <span
                key={feature}
                className="px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Limitations */}
      {limitations && limitations.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 mb-2">Limitations</p>
          <div className="space-y-1">
            {limitations.map((limitation) => (
              <div key={limitation} className="flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-xs text-slate-300">{limitation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400/80 pt-2 border-t border-white/5">
        Your workout routine will be personalized based on this equipment.
      </p>
    </div>
  )
}
