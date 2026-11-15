import type { Profile } from '@/types'

/**
 * Profile fields the AI routine and diet generators need. A profile saved by
 * "Skip for now" has none of them; the dashboard shows display defaults for
 * empty fields, which must not be sent to the AI as the user's real data.
 */
const FIELDS_PLANS_NEED = ['age', 'weight', 'height', 'goal', 'level'] as const

export type PlanField = (typeof FIELDS_PLANS_NEED)[number]

/** The needed fields the saved profile lacks (empty when plans can be generated). */
export function missingPlanFields(profile: Partial<Profile> | null | undefined): PlanField[] {
  return FIELDS_PLANS_NEED.filter((field) => {
    const value = profile?.[field]
    return value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
  })
}

export const INCOMPLETE_PROFILE_MESSAGE =
  'Complete your profile (age, weight, height, goal and level) to generate a plan.'
