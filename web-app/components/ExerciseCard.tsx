'use client'

import { useState } from 'react'
import { ExerciseCheckbox } from './ExerciseCheckbox'
import YouTubeHoverPreview from './YouTubeHoverPreview'
import { getYouTubeId } from '@/lib/youtube'

interface Exercise {
  name: string
  sets_reps: string
  youtube_urls?: string[]
  youtube_url?: string
  wikihow_url?: string
  tutorial_points?: string[]
  form_tip?: string
}

interface ExerciseCardProps {
  exercise: Exercise
  dayIndex: number
  exerciseIndex: number
  routineId: number | null
  isCompleted: boolean
  onToggle: (completed: boolean) => void
  onEnsureRoutineSaved: () => Promise<number | null>
  imageUrl?: string
}

export function ExerciseCard({
  exercise,
  dayIndex,
  exerciseIndex,
  routineId,
  isCompleted,
  onToggle,
  onEnsureRoutineSaved,
  imageUrl,
}: ExerciseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Get YouTube URLs
  const getYouTubeUrls = (): string[] => {
    const urls = Array.isArray(exercise.youtube_urls)
      ? exercise.youtube_urls.filter((x) => typeof x === 'string')
      : []
    const legacy = typeof exercise.youtube_url === 'string' && exercise.youtube_url.trim() 
      ? [exercise.youtube_url.trim()] 
      : []
    return urls.length ? urls.slice(0, 3) : legacy.slice(0, 3)
  }

  // Get tutorial points
  const getTutorialPoints = (): string[] => {
    const pts = Array.isArray(exercise.tutorial_points)
      ? exercise.tutorial_points
          .filter((x) => typeof x === 'string')
          .map((s) => s.trim())
          .filter(Boolean)
      : []
    if (pts.length >= 3) return pts.slice(0, 5)
    if (typeof exercise.form_tip === 'string' && exercise.form_tip.trim()) {
      const parts = exercise.form_tip
        .split(/[\n•\-]+/g)
        .map((s) => s.trim())
        .filter(Boolean)
      if (parts.length >= 3) return parts.slice(0, 5)
      const sentences = exercise.form_tip
        .split('.')
        .map((s) => s.trim())
        .filter(Boolean)
      return sentences.slice(0, 5)
    }
    return []
  }

  const urls = getYouTubeUrls()
  const ytId = urls[0] ? getYouTubeId(urls[0]) : null
  const points = getTutorialPoints()

  return (
    <div className="glass-soft rounded-2xl overflow-hidden hover:ring-1 hover:ring-cyan-400/40 transition-all">
      {/* Exercise Image */}
      {imageUrl && (
        <div className="relative h-44 bg-slate-800/50 overflow-hidden">
          <img 
            src={imageUrl} 
            alt={exercise.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
        </div>
      )}

      {/* YouTube Preview (if no image) */}
      {!imageUrl && ytId && (
        <YouTubeHoverPreview videoId={ytId} title={exercise.name} />
      )}

      {/* Content */}
      <div className="p-4">
        {/* Exercise Name */}
        <h5 className={`text-lg font-semibold mb-2 transition ${
          isCompleted ? 'text-emerald-300 line-through opacity-70' : 'text-cyan-300'
        }`}>
          {exercise.name}
        </h5>

        {/* Sets/Reps */}
        <p className="text-sm text-slate-200/80 mb-3">{exercise.sets_reps}</p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <ExerciseCheckbox
            routineId={routineId}
            dayIndex={dayIndex}
            exerciseIndex={exerciseIndex}
            exerciseName={exercise.name}
            initialCompleted={isCompleted}
            onEnsureRoutineSaved={onEnsureRoutineSaved}
            onToggle={onToggle}
          />

          {urls[0] && (
            <a
              href={urls[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-full bg-red-600/80 hover:bg-red-600 text-white transition flex items-center gap-1"
            >
              <span>Watch</span>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 .61-.03 1.3-.1 2.1-.06.8-.15 1.43-.28 1.9-.13.47-.38.85-.73 1.14-.35.29-.85.46-1.5.53-.65.07-1.46.12-2.43.15-1 .03-1.92.05-2.75.05L12 18c-.83 0-1.75-.02-2.75-.05-.97-.03-1.78-.08-2.43-.15-.65-.07-1.15-.24-1.5-.53-.35-.29-.6-.67-.73-1.14-.13-.47-.22-1.1-.28-1.9-.06-.8-.09-1.49-.09-2.09L4 12c0-.61.03-1.3.09-2.1.06-.8.15-1.43.28-1.9.13-.47.38-.85.73-1.14.35-.29.85-.46 1.5-.53.65-.07 1.46-.12 2.43-.15 1-.03 1.92-.05 2.75-.05L12 6c.83 0 1.75.02 2.75.05.97.03 1.78.08 2.43.15.65.07 1.15.24 1.5.53.35.29.6.67.73 1.14z" />
              </svg>
            </a>
          )}

          {exercise.wikihow_url && (
            <a
              href={exercise.wikihow_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-full bg-blue-600/80 hover:bg-blue-600 text-white transition flex items-center gap-1"
            >
              <span>WikiHow</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>

        {/* Expandable Tutorial Points */}
        {points.length > 0 && (
          <div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between text-sm font-semibold text-slate-100 mb-2 hover:text-cyan-300 transition"
            >
              <span>Tutorial Points</span>
              <svg 
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isExpanded && (
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-200/80 mb-3">
                {points.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Additional Videos */}
        {urls.length > 1 && isExpanded && (
          <div>
            <div className="text-xs font-semibold text-slate-100 mb-2">Additional videos</div>
            <div className="flex flex-wrap gap-2">
              {urls.slice(1, 4).map((u, i) => (
                <a
                  key={i}
                  href={u}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-2 rounded-xl glass-menu text-slate-100 hover:text-white transition"
                >
                  Tutorial {i + 2}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
