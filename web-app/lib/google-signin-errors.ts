/**
 * Messages for the error codes the Google sign-in routes put on
 * /login?error=<code> (app/api/auth/google/start and /callback).
 */
export type SignInErrorMessage = { title: string; description: string };

const RETRY = 'Please try again, or sign in with your username and password.';

const GOOGLE_SIGN_IN_ERRORS: Record<string, SignInErrorMessage> = {
  google_access_denied: { title: 'Google sign-in was cancelled', description: 'Choose a Google account to continue, or sign in with your username and password.' },
  google_not_configured: { title: 'Google sign-in is unavailable', description: 'Please sign in with your username and password.' },
  google_missing_code: { title: 'Google sign-in expired', description: RETRY },
  google_state_mismatch: { title: 'Google sign-in expired', description: RETRY },
};

const GENERIC_GOOGLE_ERROR: SignInErrorMessage = { title: 'Google sign-in failed', description: RETRY };

/** The message for a /login error code, or null when the code is not a Google sign-in error. */
export function googleSignInErrorMessage(code: string | null): SignInErrorMessage | null {
  if (!code || !code.startsWith('google_')) return null;
  return GOOGLE_SIGN_IN_ERRORS[code] ?? GENERIC_GOOGLE_ERROR;
}
