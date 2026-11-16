import { describe, expect, it } from "vitest";
import { buildDayBreakdowns, calculateWeekProgress, estimatedWorkoutMinutes, todaysRoutineIndex, workoutTitle } from "@/lib/week-progress";
import type { WeeklyRoutine } from "@/types";

const exercise = (name: string) => ({ name, sets_reps: "3 sets x 10 reps", youtube_urls: [] });
const routine = {
  days: [
    { day: "Monday - Push (Chest, Shoulders, Triceps and some very long text)", exercises: [exercise("Bench"), exercise("Press")] },
    { day: "Tuesday \u2013 Rest", exercises: [] },
    { day: "Wednesday - Legs", exercises: [exercise("Squat")] },
  ],
} as unknown as WeeklyRoutine;

describe("calculateWeekProgress", () => {
  it("counts each exercise, and each rest day as one item", () => {
    const exercises = new Map([["0-0", true], ["2-0", true]]);
    const restDays = new Map([[1, true]]);
    expect(calculateWeekProgress(routine, exercises, restDays)).toEqual({ completed: 3, total: 4, percentage: 75 });
  });

  it("is empty without a routine", () => {
    expect(calculateWeekProgress(null, new Map(), new Map())).toEqual({ completed: 0, total: 0, percentage: 0 });
  });
});

describe("buildDayBreakdowns", () => {
  it("labels days by weekday, trims long names and treats rest days as one item", () => {
    const days = buildDayBreakdowns(routine, new Map([["0-1", true]]), new Map([[1, true]]));
    expect(days.map((d) => d.label)).toEqual(["Mon", "Tue", "Wed"]);
    expect(days[0]).toMatchObject({ completed: 1, total: 2, isRestDay: false });
    expect(days[0].fullName).toHaveLength(41);
    expect(days[0].fullName.endsWith("\u2026")).toBe(true);
    expect(days[1]).toMatchObject({ completed: 1, total: 1, isRestDay: true, fullName: "Tuesday \u2013 Rest" });
    expect(days[2]).toMatchObject({ completed: 0, total: 1 });
  });
});

describe("todaysRoutineIndex and estimatedWorkoutMinutes", () => {
  it("maps Monday to day 0 and Sunday to day 6, capped at the routine length", () => {
    expect(todaysRoutineIndex(new Date("2026-11-16T09:00:00"), 7)).toBe(0); // Monday
    expect(todaysRoutineIndex(new Date("2026-11-22T09:00:00"), 7)).toBe(6); // Sunday
    expect(todaysRoutineIndex(new Date("2026-11-22T09:00:00"), 3)).toBe(2);
  });

  it("estimates 8 minutes per exercise plus 12 for warm-up", () => {
    expect(estimatedWorkoutMinutes(3)).toBe(36);
    expect(estimatedWorkoutMinutes(0)).toBe(12);
  });
});

describe("workoutTitle", () => {
  it("drops the leading weekday the AI puts in day names", () => {
    expect(workoutTitle("Monday - Push (Chest, Shoulders, Triceps)")).toBe("Push (Chest, Shoulders, Triceps)");
    expect(workoutTitle("Tuesday \u2013 Rest")).toBe("Rest");
    expect(workoutTitle("wednesday: Legs")).toBe("Legs");
  });

  it("keeps names without a weekday prefix, and never returns an empty title", () => {
    expect(workoutTitle("Full Body")).toBe("Full Body");
    expect(workoutTitle("Monday")).toBe("Monday");
  });
});
