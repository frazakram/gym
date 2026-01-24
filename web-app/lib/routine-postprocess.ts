import type { WeeklyRoutine } from "@/types";
import { sanitizeYouTubeUrls } from "@/lib/youtube";

export function postProcessRoutine(routine: WeeklyRoutine): WeeklyRoutine {
  /* ENFORCE 7-DAY WEEK */
  const days = routine?.days || [];
  const filledDays = [...days];

  // If fewer than 7 days, append Rest Days
  while (filledDays.length < 7) {
    const nextDayIndex = filledDays.length;
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    // Try to guess the day name, or generic "Rest Day"
    const name = dayNames[nextDayIndex] ? `${dayNames[nextDayIndex]} - Rest Day` : `Day ${nextDayIndex + 1} - Rest Day`;
    
    filledDays.push({
      day: name,
      exercises: [],
    });
  }

  return {
    ...routine,
    days: filledDays.map((day) => ({
      ...day,
      exercises: (day?.exercises || []).map((ex: any) => ({
        ...ex,
        youtube_urls: sanitizeYouTubeUrls(ex?.youtube_urls, 3),
      })),
    })),
  };
}


