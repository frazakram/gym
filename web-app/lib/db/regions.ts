// Nationality and region.
import { revalidateTag } from 'next/cache';
import { MOCK_USER_ID, allowMockAuth, pool } from './core';

// ============= NATIONALITY / REGION =============

const COUNTRY_TO_REGION: Record<string, 'APAC' | 'EMEA' | 'NA' | 'LATAM'> = {
  // APAC
  IN: 'APAC', CN: 'APAC', JP: 'APAC', KR: 'APAC', TH: 'APAC', VN: 'APAC',
  ID: 'APAC', MY: 'APAC', SG: 'APAC', PH: 'APAC', AU: 'APAC', NZ: 'APAC',
  PK: 'APAC', BD: 'APAC', LK: 'APAC', NP: 'APAC', TW: 'APAC', HK: 'APAC',
  // NA
  US: 'NA', CA: 'NA', MX: 'NA',
  // LATAM
  BR: 'LATAM', AR: 'LATAM', CO: 'LATAM', CL: 'LATAM', PE: 'LATAM',
  VE: 'LATAM', EC: 'LATAM', UY: 'LATAM', PY: 'LATAM', BO: 'LATAM',
  // EMEA
  GB: 'EMEA', DE: 'EMEA', FR: 'EMEA', IT: 'EMEA', ES: 'EMEA', NL: 'EMEA',
  SE: 'EMEA', NO: 'EMEA', DK: 'EMEA', FI: 'EMEA', IE: 'EMEA', PT: 'EMEA',
  PL: 'EMEA', CH: 'EMEA', AT: 'EMEA', BE: 'EMEA', GR: 'EMEA', CZ: 'EMEA',
  RU: 'EMEA', UA: 'EMEA', TR: 'EMEA', SA: 'EMEA', AE: 'EMEA', IL: 'EMEA',
  EG: 'EMEA', ZA: 'EMEA', NG: 'EMEA', KE: 'EMEA', MA: 'EMEA',
};

export function countryToRegion(countryCode: string | null | undefined): 'APAC' | 'EMEA' | 'NA' | 'LATAM' | null {
  if (!countryCode) return null;
  const code = countryCode.toUpperCase();
  return COUNTRY_TO_REGION[code] ?? 'EMEA';
}

export async function saveNationality(
  userId: number,
  nationality: string | null,
  region: 'APAC' | 'EMEA' | 'NA' | 'LATAM' | null
): Promise<void> {
  if (allowMockAuth() && userId === MOCK_USER_ID) return;
  try {
    await pool.query(
      `UPDATE profiles SET nationality = $2, region = $3, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
      [userId, nationality, region]
    );
    revalidateTag('user-profile', undefined as any);
  } catch (error) {
    console.error("saveNationality failed:", error);
  }
}
