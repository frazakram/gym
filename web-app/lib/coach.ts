export type Coach = {
  id: string;
  name: string;
  phone: string;
  email: string;
};

/**
 * The default ("Phase 1") coach shown to users who have not picked an approved
 * coach. Contact details come only from the environment, read per call:
 *   DEFAULT_COACH_ID, DEFAULT_COACH_NAME, DEFAULT_COACH_PHONE, DEFAULT_COACH_EMAIL
 * There are deliberately no built-in phone/email fallbacks: personal contact
 * details must not live in source control. (The id/name fallbacks are unchanged.)
 */
export function getDefaultCoach(): Coach {
  return {
    id: process.env.DEFAULT_COACH_ID?.trim() || "rajesh-sharma",
    name: process.env.DEFAULT_COACH_NAME?.trim() || "Rajesh Sharma",
    phone: process.env.DEFAULT_COACH_PHONE?.trim() || "",
    email: process.env.DEFAULT_COACH_EMAIL?.trim() || "",
  };
}

/** A coach can only receive bookings if both contact channels are configured. */
export function hasCoachContactDetails(coach: Pick<Coach, "phone" | "email">): boolean {
  return Boolean(coach.phone && coach.email);
}
