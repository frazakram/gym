/**
 * YouTube Data API v3 helpers for server-side video verification and search.
 *
 * Requires YOUTUBE_API_KEY env var (Google Cloud Console → YouTube Data API v3).
 * All functions degrade gracefully when the key is absent — routine generation
 * still works, videos are just not verified.
 *
 * Quota cost:
 *   batchVerifyVideoIds  — 1 unit per 50 IDs  (one call per routine)
 *   searchYouTubeForExercise — 100 units per call  (only for exercises with 0 valid URLs)
 */

const YT_API = 'https://www.googleapis.com/youtube/v3';

/**
 * Verify up to 50 video IDs per API call.
 * Returns a Set containing only IDs that YouTube confirms exist and are public.
 * Falls back to treating all IDs as valid on any API/network error so routine
 * generation is never blocked.
 */
export async function batchVerifyVideoIds(ids: string[]): Promise<Set<string>> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || ids.length === 0) return new Set(ids);

  const validIds = new Set<string>();
  // YouTube videos.list accepts up to 50 comma-separated IDs per request
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    try {
      const res = await fetch(
        `${YT_API}/videos?part=id&id=${batch.map(encodeURIComponent).join('%2C')}&key=${key}`,
        { next: { revalidate: 0 } } // always fresh
      );
      if (!res.ok) {
        // Quota exceeded or bad key — don't kill routine generation
        console.warn(`[youtube-verify] videos.list HTTP ${res.status} — treating batch as valid`);
        batch.forEach(id => validIds.add(id));
        continue;
      }
      const data = await res.json() as { items?: { id: string }[] };
      for (const item of data.items ?? []) validIds.add(item.id);
    } catch (err) {
      console.warn('[youtube-verify] batchVerifyVideoIds network error:', err);
      batch.forEach(id => validIds.add(id));
    }
  }
  return validIds;
}

/**
 * Search YouTube for the best tutorial video for a given exercise name.
 * Only called when an exercise ends up with 0 valid URLs after verification.
 * Returns a canonical youtube.com/watch?v= URL, or null on any failure.
 */
export async function searchYouTubeForExercise(exerciseName: string): Promise<string | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;

  try {
    const q = encodeURIComponent(`${exerciseName} proper form tutorial`);
    const res = await fetch(
      `${YT_API}/search?part=id&type=video&q=${q}&maxResults=3&relevanceLanguage=en&key=${key}`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) {
      console.warn(`[youtube-verify] search HTTP ${res.status} for "${exerciseName}"`);
      return null;
    }
    const data = await res.json() as { items?: { id: { videoId: string } }[] };
    const videoId = data.items?.[0]?.id?.videoId;
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
  } catch (err) {
    console.warn(`[youtube-verify] searchYouTubeForExercise error for "${exerciseName}":`, err);
    return null;
  }
}
