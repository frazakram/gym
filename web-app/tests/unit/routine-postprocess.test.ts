import { describe, expect, it, vi } from "vitest";
import type { WeeklyRoutine } from "@/types";

// Guard: without YOUTUBE_API_KEY the post-processor must not touch the network.
vi.mock("@/lib/youtube-verify", () => ({
  batchVerifyVideoIds: vi.fn(() => {
    throw new Error("network call not expected");
  }),
  searchYouTubeForExercise: vi.fn(() => {
    throw new Error("network call not expected");
  }),
}));

import { postProcessRoutine } from "@/lib/routine-postprocess";

const ID = "dQw4w9WgXcQ";

function routine(days: unknown[]): WeeklyRoutine {
  return { days } as unknown as WeeklyRoutine;
}

describe("postProcessRoutine (no YOUTUBE_API_KEY)", () => {
  it("pads the week to exactly 7 days with named rest days", async () => {
    const out = await postProcessRoutine(
      routine([{ day: "Monday - Push", exercises: [{ name: "Bench", youtube_urls: [] }] }]),
    );
    expect(out.days).toHaveLength(7);
    expect(out.days[0].day).toBe("Monday - Push");
    expect(out.days.slice(1).map((d) => d.day)).toEqual([
      "Tuesday - Rest Day",
      "Wednesday - Rest Day",
      "Thursday - Rest Day",
      "Friday - Rest Day",
      "Saturday - Rest Day",
      "Sunday - Rest Day",
    ]);
    expect(out.days[6].exercises).toEqual([]);
  });

  it("does not truncate routines longer than 7 days", async () => {
    const days = Array.from({ length: 8 }, (_, i) => ({ day: `D${i}`, exercises: [] }));
    const out = await postProcessRoutine(routine(days));
    expect(out.days).toHaveLength(8);
  });

  it("sanitises youtube_urls to canonical, deduped, max 3", async () => {
    const out = await postProcessRoutine(
      routine([
        {
          day: "Monday",
          exercises: [
            {
              name: "Squat",
              youtube_urls: [`https://youtu.be/${ID}`, `https://www.youtube.com/watch?v=${ID}`, "bad"],
            },
            { name: "No urls" },
          ],
        },
      ]),
    );
    const [squat, noUrls] = out.days[0].exercises as unknown as Array<{ youtube_urls: string[] }>;
    expect(squat.youtube_urls).toEqual([`https://www.youtube.com/watch?v=${ID}`]);
    expect(noUrls.youtube_urls).toEqual([]);
  });

  it("handles a missing days array and keeps other routine fields", async () => {
    const out = await postProcessRoutine({ title: "X" } as unknown as WeeklyRoutine);
    expect(out.days).toHaveLength(7);
    expect((out as unknown as { title: string }).title).toBe("X");
  });

  it("does not mutate the input", async () => {
    const input = routine([{ day: "Mon", exercises: [{ name: "A", youtube_urls: ["bad"] }] }]);
    const snapshot = JSON.parse(JSON.stringify(input));
    await postProcessRoutine(input);
    expect(input).toEqual(snapshot);
  });
});
