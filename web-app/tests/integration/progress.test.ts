import { describe, expect, it } from "vitest";
import { POST as saveRoutine } from "@/app/api/routines/route";
import { POST as postCompletion } from "@/app/api/completions/route";
import { GET as getProgress } from "@/app/api/progress/route";
import { asHandler, call, newUser } from "./helpers";

const ROUTINE = {
  days: [
    {
      day: "Monday - Full Body",
      exercises: [
        { name: "Bench Press", sets_reps: "3 sets x 10 reps", youtube_urls: [] },
        { name: "Treadmill Run", sets_reps: "1 x 20 min", youtube_urls: [] },
        { name: "Goblet Squat", sets_reps: "3 x 10", youtube_urls: [] },
      ],
    },
  ],
};

async function userWithCompletions(prefix: string, exerciseIndexes: number[]) {
  const user = await newUser(prefix);
  const saved = await call(asHandler(saveRoutine), { method: "POST", path: "/api/routines", userId: user.id, body: { weekNumber: 1, routine: ROUTINE } });
  expect(saved.status).toBe(200);
  for (const exerciseIndex of exerciseIndexes) {
    const r = await call(asHandler(postCompletion), {
      method: "POST",
      path: "/api/completions",
      userId: user.id,
      body: { routineId: saved.body.routineId, dayIndex: 0, exerciseIndex, completed: true },
    });
    expect(r.status).toBe(200);
  }
  return user;
}

describe("GET /api/progress", () => {
  it("requires a session", async () => {
    const r = await call(asHandler(getProgress), { path: "/api/progress?range=week" });
    expect(r.status).toBe(401);
  });

  it("rejects an unknown range", async () => {
    const { id } = await newUser("prog");
    const r = await call(asHandler(getProgress), { path: "/api/progress?range=year", userId: id });
    expect(r.status).toBe(400);
  });

  it("counts today's completed exercises as strength and cardio minutes, for this user only", async () => {
    const me = await userWithCompletions("prog", [0, 1]); // Bench Press (strength) + Treadmill Run (cardio)
    await userWithCompletions("prog_other", [0, 1, 2]);

    const week = await call(asHandler(getProgress), { path: "/api/progress?range=week", userId: me.id });
    expect(week.status).toBe(200);
    expect(week.body.range).toBe("week");
    expect(week.body.buckets).toHaveLength(7);
    expect(week.body.buckets[6]).toMatchObject({ label: "Today", strength_min: 8, cardio_min: 8 });
    expect(week.body.totals).toEqual({ strength_min: 8, cardio_min: 8, active_days: 1 });

    const month = await call(asHandler(getProgress), { path: "/api/progress?range=month", userId: me.id });
    expect(month.body.buckets).toHaveLength(4);
    expect(month.body.buckets[3]).toMatchObject({ label: "This wk", strength_min: 8, cardio_min: 8 });
  });

  it("is an empty week for a new user", async () => {
    const { id } = await newUser("prog");
    const r = await call(asHandler(getProgress), { path: "/api/progress", userId: id });
    expect(r.status).toBe(200);
    expect(r.body.totals).toEqual({ strength_min: 0, cardio_min: 0, active_days: 0 });
  });
});
