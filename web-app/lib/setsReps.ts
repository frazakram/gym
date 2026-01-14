export type SetsRepsMeta = {
  sets?: number
  reps?: number
  restSeconds?: number
  raw: string
}

/**
 * Best-effort parser for AI-generated prescriptions like:
 * - "3 sets x 10 reps (rest 90s)"
 * - "4 x 8–10 (rest 2 min)"
 * - "3 sets of 12 reps"
 */
export function parseSetsReps(raw: string): SetsRepsMeta {
  const text = (raw || '').trim()
  const meta: SetsRepsMeta = { raw: text }
  if (!text) return meta

  // sets: "3 sets" or leading "3 x"
  const setsMatch =
    text.match(/\b(\d+)\s*(?:sets?|set)\b/i) ||
    text.match(/^\s*(\d+)\s*[x×]\s*/i)
  if (setsMatch) meta.sets = Number(setsMatch[1])

  // reps: "10 reps" or "x 10"
  const repsMatch =
    text.match(/\b(\d+)(?:\s*[-–]\s*\d+)?\s*(?:reps?|rep)\b/i) ||
    text.match(/[x×]\s*(\d+)(?:\s*[-–]\s*\d+)?\b/i)
  if (repsMatch) meta.reps = Number(repsMatch[1])

  // rest: "(rest 90s)" or "rest 2 min"
  const restMatch = text.match(/\brest\s*([0-9]+(?:\.[0-9]+)?)\s*(s|sec|secs|seconds|m|min|mins|minutes)\b/i)
  if (restMatch) {
    const value = Number(restMatch[1])
    const unit = restMatch[2].toLowerCase()
    meta.restSeconds = unit.startsWith('m') ? Math.round(value * 60) : Math.round(value)
  }

  return meta
}

