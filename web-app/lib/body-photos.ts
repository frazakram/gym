import { decrypt, encryptRnd, isEncrypted } from "@/lib/fieldEncryption";

/**
 * Storage format of profiles.body_photos (JSONB):
 * - with DB_ENCRYPTION_KEY: a JSON string "enc:..." holding the AES-256-GCM
 *   encrypted JSON of the photo list;
 * - without a key, or legacy rows: the plain JSON array.
 */

/** JSON text for the JSONB column, or null to store NULL. */
export function encodeBodyPhotos(photos: unknown[] | null): string | null {
  if (photos == null) return null;
  const plainJson = JSON.stringify(photos);
  const encrypted = encryptRnd(plainJson); // passthrough when no key is configured
  return encrypted === plainJson ? plainJson : JSON.stringify(encrypted);
}

/** True if the stored value is a legacy plaintext list that should be re-encrypted. */
export function isPlaintextBodyPhotos(stored: unknown): stored is unknown[] {
  return Array.isArray(stored) && stored.length > 0;
}

/**
 * The photo list from a stored column value. Never returns ciphertext: if the
 * value cannot be decrypted (missing or wrong key) it logs and returns [].
 */
export function decodeBodyPhotos(stored: unknown): unknown[] {
  if (Array.isArray(stored)) return stored;
  if (typeof stored !== "string" || !isEncrypted(stored)) return [];
  const plainJson = decrypt(stored);
  if (plainJson === stored) {
    console.error("[body-photos] stored photos could not be decrypted (DB_ENCRYPTION_KEY missing or wrong)");
    return [];
  }
  try {
    const photos: unknown = JSON.parse(plainJson);
    return Array.isArray(photos) ? photos : [];
  } catch {
    console.error("[body-photos] decrypted photos are not valid JSON");
    return [];
  }
}
