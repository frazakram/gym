'use client'

import type { BodyCompositionAnalysis } from '@/types'

interface BodyCompositionSummaryProps {
  analysis: BodyCompositionAnalysis
}

export function BodyCompositionSummary({ analysis }: BodyCompositionSummaryProps) {
  const { 
    body_type, 
    estimated_body_fat_range, 
    muscle_development, 
    posture_notes, 
    focus_areas, 
    realistic_timeline,
    exercise_modifications,
    overall_assessment,
    confidence_score 
  } = analysis

  return (
    <div className="mt-4 glass-soft rounded-2xl border border-white/10 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">AI Body Analysis</h4>
        <span className="text-xs text-slate-300/70">
          {Math.round(confidence_score * 100)}% confidence
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <div>
          <p className="text-xs text-slate-400 mb-1">Body Type</p>
          <p className="text-sm font-medium text-white capitalize">{body_type}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Muscle Dev.</p>
          <p className="text-sm font-medium text-white capitalize">{muscle_development.replace('_', ' ')}</p>
        </div>
        {estimated_body_fat_range && (
          <div className="col-span-2">
            <p className="text-xs text-slate-400 mb-1">Modern Est. Body Fat</p>
            <p className="text-sm font-medium text-emerald-400">{estimated_body_fat_range}</p>
          </div>
        )}
      </div>

      <p className="text-sm text-slate-200 italic border-l-2 border-emerald-500/50 pl-3 py-1">
        "{overall_assessment}"
      </p>

      {focus_areas && focus_areas.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 mb-2">Recommended Focus Areas</p>
          <div className="flex flex-wrap gap-2">
            {focus_areas.map((area) => (
              <span
                key={area}
                className="px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {posture_notes && posture_notes.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 mb-2">Posture & Form Notes</p>
          <ul className="list-disc list-inside space-y-1">
            {posture_notes.map((note) => (
              <li key={note} className="text-xs text-slate-300">{note}</li>
            ))}
          </ul>
        </div>
      )}

      {realistic_timeline && (
        <div className="bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/10">
          <p className="text-xs text-emerald-400/80 mb-1 uppercase tracking-wider font-semibold">Projected Timeline</p>
          <p className="text-xs text-emerald-200">{realistic_timeline}</p>
        </div>
      )}

      <div className="pt-2 border-t border-white/5 text-[10px] text-slate-500 leading-tight">
        <p>Private analysis. Photos are not permanently stored. Results used to personalize your routine.</p>
      </div>
    </div>
  )
}
