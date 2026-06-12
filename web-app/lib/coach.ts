export type Coach = {
  id: string;
  name: string;
  phone: string;
  email: string;
};

/**
 * Default ("Phase 1") coach.
 *
 * Sourced from environment variables so credentials aren't baked into the
 * repo. Falls back to the original values when the env vars are unset, so
 * local dev and existing deployments keep working unchanged.
 *
 * Configure in production via:
 *   DEFAULT_COACH_ID, DEFAULT_COACH_NAME, DEFAULT_COACH_PHONE, DEFAULT_COACH_EMAIL
 */
export const HARD_CODED_COACH: Coach = {
  id: process.env.DEFAULT_COACH_ID || "rajesh-sharma",
  name: process.env.DEFAULT_COACH_NAME || "Rajesh Sharma",
  phone: process.env.DEFAULT_COACH_PHONE || "9001118162",
  email: process.env.DEFAULT_COACH_EMAIL || "neophyteold@gmail.com",
};
