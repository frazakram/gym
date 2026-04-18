import type { WeeklyRoutine } from "@/types";
import { sanitizeYouTubeUrls, getYouTubeId } from "@/lib/youtube";
import { batchVerifyVideoIds, searchYouTubeForExercise } from "@/lib/youtube-verify";

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export async function postProcessRoutine(routine: WeeklyRoutine): Promise<WeeklyRoutine> {
  /* ── STEP 1: Sanitize URLs produced by the AI ──────────────────────────── */
  const days = (routine?.days || []).map((day) => ({
    ...day,
    exercises: (day?.exercises || []).map((ex: any) => ({
      ...ex,
      youtube_urls: sanitizeYouTubeUrls(ex?.youtube_urls, 3),
    })),
  }));

  /* ── STEP 2 + 3: Verify & fill gaps (only when YOUTUBE_API_KEY is set) ─── */
  if (process.env.YOUTUBE_API_KEY) {
    // Collect every video ID the AI gave us across the whole routine (one batch)
    const allVideoIds: string[] = [];
    for (const day of days) {
      for (const ex of day.exercises ?? []) {
        for (const url of (ex as any).youtube_urls ?? []) {
          const id = getYouTubeId(url);
          if (id) allVideoIds.push(id);
        }
      }
    }

    // STEP 2: Batch-verify all IDs — costs just 1 quota unit for up to 50 IDs
    const validIds = allVideoIds.length > 0
      ? await batchVerifyVideoIds(allVideoIds)
      : new Set<string>();

    // Identify exercises that end up with 0 valid URLs after filtering
    const needsSearch: Array<{ ex: any }> = [];

    for (const day of days) {
      for (const ex of day.exercises ?? []) {
        const anyEx = ex as any;
        anyEx.youtube_urls = (anyEx.youtube_urls ?? []).filter((url: string) => {
          const id = getYouTubeId(url);
          return id ? validIds.has(id) : false;
        });
        if (anyEx.youtube_urls.length === 0 && anyEx.name) {
          needsSearch.push({ ex: anyEx });
        }
      }
    }

    // STEP 3: Search fallback — run in parallel batches of 5 to stay inside rate limits
    if (needsSearch.length > 0) {
      const BATCH = 5;
      for (let i = 0; i < needsSearch.length; i += BATCH) {
        await Promise.all(
          needsSearch.slice(i, i + BATCH).map(async ({ ex }) => {
            const found = await searchYouTubeForExercise(ex.name as string);
            if (found) ex.youtube_urls = [found];
          })
        );
      }
    }
  }

  /* ── STEP 4: Enforce exactly 7-day week ────────────────────────────────── */
  const filledDays = [...days];
  while (filledDays.length < 7) {
    const idx = filledDays.length;
    filledDays.push({
      day: DAY_NAMES[idx] ? `${DAY_NAMES[idx]} - Rest Day` : `Day ${idx + 1} - Rest Day`,
      exercises: [],
    });
  }

  return { ...routine, days: filledDays };
}
