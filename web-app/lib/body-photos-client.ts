"use client";

import type { BodyPhoto } from "@/types";
import { csrfFetch } from "@/lib/useCsrf";

/** The signed-in user's body photos (served separately from the profile). */
export async function loadBodyPhotos(): Promise<BodyPhoto[]> {
  try {
    const response = await csrfFetch("/api/body/photos", { cache: "no-store" });
    if (!response.ok) return [];
    const data: unknown = await response.json();
    const photos = (data as { body_photos?: unknown } | null)?.body_photos;
    return Array.isArray(photos) ? (photos as BodyPhoto[]) : [];
  } catch {
    return [];
  }
}
