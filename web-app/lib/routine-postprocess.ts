import type { WeeklyRoutine } from "@/types";
import { sanitizeYouTubeUrls } from "@/lib/youtube";

export function postProcessRoutine(routine: WeeklyRoutine): WeeklyRoutine {
  return {
    ...routine,
    days: (routine?.days || []).map((day) => ({
      ...day,
      exercises: (day?.exercises || []).map((ex: any) => ({
        ...ex,
        youtube_urls: sanitizeYouTubeUrls(ex?.youtube_urls, 3),
      })),
    })),
  };
}


