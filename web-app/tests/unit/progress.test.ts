import { describe, expect, it } from "vitest";
import { buildProgress, exerciseKind, MINUTES_PER_EXERCISE } from "@/lib/progress";

const NOW = new Date("2026-11-16T09:00:00Z"); // a Monday

describe("exerciseKind", () => {
  it("recognises cardio by name and treats everything else as strength", () => {
    for (const name of ["Treadmill Run", "Cycling", "Jump Rope", "HIIT Sprints", "Rowing machine", "Brisk walk", "Elliptical", "Stair climber", "Swimming"]) {
      expect(exerciseKind(name)).toBe("cardio");
    }
    for (const name of ["Bench Press", "Goblet Squat", "Barbell Row", "Push-up", "Romanian Deadlift"]) {
      expect(exerciseKind(name)).toBe("strength");
    }
  });
});

describe("buildProgress: week", () => {
  it("has the last 7 days ending today, labelled by weekday, today last", () => {
    const p = buildProgress([], { range: "week", now: NOW });
    expect(p.buckets.map((b) => b.label)).toEqual(["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Today"]);
    expect(p.buckets[6].start).toBe("2026-11-16");
    expect(p.goal_minutes).toBe(30);
  });

  it("adds an estimated 8 minutes per completed exercise to its kind, and counts active days", () => {
    const p = buildProgress([
      { date: "2026-11-16", name: "Bench Press" },
      { date: "2026-11-16", name: "Treadmill Run" },
      { date: "2026-11-14", name: "Goblet Squat" },
      { date: "2026-11-01", name: "Old Squat" }, // outside the week
    ], { range: "week", now: NOW });
    expect(p.buckets[6]).toMatchObject({ strength_min: MINUTES_PER_EXERCISE, cardio_min: MINUTES_PER_EXERCISE });
    expect(p.buckets[4]).toMatchObject({ strength_min: 8, cardio_min: 0 });
    expect(p.totals).toEqual({ strength_min: 16, cardio_min: 8, active_days: 2 });
  });
});

describe("buildProgress: month", () => {
  it("groups the last 28 days into four weeks, this week last", () => {
    const p = buildProgress([
      { date: "2026-11-16", name: "Bench Press" },
      { date: "2026-11-10", name: "Bench Press" },
      { date: "2026-10-20", name: "Cycling" },
      { date: "2026-10-19", name: "Cycling" }, // 28 days back: outside
    ], { range: "month", now: NOW });
    expect(p.buckets.map((b) => b.label)).toEqual(["Wk 1", "Wk 2", "Wk 3", "This wk"]);
    expect(p.buckets.map((b) => b.start)).toEqual(["2026-10-20", "2026-10-27", "2026-11-03", "2026-11-10"]);
    expect(p.buckets[3].strength_min).toBe(16);
    expect(p.buckets[0].cardio_min).toBe(8);
    expect(p.totals.active_days).toBe(3);
    expect(p.goal_minutes).toBe(210);
  });
});
