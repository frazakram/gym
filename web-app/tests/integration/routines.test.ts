import { describe, expect, it } from "vitest";
import { GET as listRoutines, POST as saveRoutine } from "@/app/api/routines/route";
import { DELETE as deleteRoutine, PATCH as patchRoutine } from "@/app/api/routines/[id]/route";
import { GET as getCompletions, POST as postCompletion } from "@/app/api/completions/route";
import { GET as getDays, POST as postDay } from "@/app/api/day-completions/route";
import { asHandler, call, newUser } from "./helpers";

const ROUTINE = {
  days: [
    {
      day: "Monday - Push",
      exercises: [
        { name: "Bench Press", sets_reps: "3 sets x 10 reps", youtube_urls: [] },
        { name: "Overhead Press", sets_reps: "3 x 8", youtube_urls: [] },
      ],
    },
    { day: "Tuesday - Rest Day", exercises: [] },
  ],
};

async function save(userId: number, weekNumber = 1) {
  const r = await call(asHandler(saveRoutine), {
    method: "POST",
    path: "/api/routines",
    userId,
    body: { weekNumber, routine: ROUTINE },
  });
  expect(r.status).toBe(200);
  return r.body.routineId as number;
}

describe("/api/routines", () => {
  it("saves a routine and returns it as the latest", async () => {
    const { id } = await newUser("rt");
    const routineId = await save(id);
    expect(routineId).toEqual(expect.any(Number));

    const r = await call(asHandler(listRoutines), { path: "/api/routines", userId: id });
    expect(r.status).toBe(200);
    expect(r.body.routine).toMatchObject({ id: routineId, user_id: id, week_number: 1 });
    expect(r.body.routine.routine_json.days[0].day).toBe("Monday - Push");
  });

  it("returns routine null for a user with no routines", async () => {
    const { id } = await newUser("rt");
    const r = await call(asHandler(listRoutines), { path: "/api/routines", userId: id });
    expect(r).toMatchObject({ status: 200, body: { routine: null } });
  });

  it("lists all routines with all=true", async () => {
    const { id } = await newUser("rt");
    await save(id, 1);
    await save(id, 2);
    const r = await call(asHandler(listRoutines), { path: "/api/routines?all=true", userId: id });
    expect(r.body.routines).toHaveLength(2);
  });

  it("requires CSRF and a valid body to save", async () => {
    const { id } = await newUser("rt");
    const noCsrf = await call(asHandler(saveRoutine), {
      method: "POST",
      path: "/api/routines",
      userId: id,
      body: { weekNumber: 1, routine: ROUTINE },
      csrf: false,
    });
    expect(noCsrf.status).toBe(403);
    const bad = await call(asHandler(saveRoutine), {
      method: "POST",
      path: "/api/routines",
      userId: id,
      body: { weekNumber: 99, routine: ROUTINE },
    });
    expect(bad.status).toBe(400);
  });
});

describe("object-level access control", () => {
  it("another user cannot see, archive or delete my routine", async () => {
    const owner = await newUser("own");
    const other = await newUser("oth");
    const routineId = await save(owner.id);

    const list = await call(asHandler(listRoutines), { path: "/api/routines?all=true", userId: other.id });
    expect(list.body.routines).toEqual([]);

    const archive = await call(asHandler(patchRoutine), {
      method: "PATCH",
      path: `/api/routines/${routineId}`,
      userId: other.id,
      params: { id: String(routineId) },
      body: { archived: true },
    });
    expect(archive.status).toBe(404);

    const del = await call(asHandler(deleteRoutine), {
      method: "DELETE",
      path: `/api/routines/${routineId}`,
      userId: other.id,
      params: { id: String(routineId) },
    });
    expect(del.status).toBe(404);

    // Still there for the owner.
    const mine = await call(asHandler(listRoutines), { path: "/api/routines?all=true", userId: owner.id });
    expect(mine.body.routines).toHaveLength(1);
  });

  it("another user cannot record or read completions on my routine", async () => {
    const owner = await newUser("own");
    const other = await newUser("oth");
    const routineId = await save(owner.id);

    const write = await call(asHandler(postCompletion), {
      method: "POST",
      path: "/api/completions",
      userId: other.id,
      body: { routineId, dayIndex: 0, exerciseIndex: 0, completed: true },
    });
    expect(write.status).toBe(403);

    const read = await call(asHandler(getCompletions), {
      path: `/api/completions?routineId=${routineId}`,
      userId: other.id,
    });
    expect(read.status).toBe(200);
    expect(read.body.completions).toEqual([]);

    const day = await call(asHandler(postDay), {
      method: "POST",
      path: "/api/day-completions",
      userId: other.id,
      body: { routineId, dayIndex: 0, completed: true },
    });
    expect(day.status).toBeGreaterThanOrEqual(400);
  });
});

describe("completions", () => {
  it("records, reads back and un-records an exercise completion with logged sets", async () => {
    const { id } = await newUser("cmp");
    const routineId = await save(id);

    const done = await call(asHandler(postCompletion), {
      method: "POST",
      path: "/api/completions",
      userId: id,
      body: { routineId, dayIndex: 0, exerciseIndex: 1, completed: true, actual_weight: 40, actual_reps: 8 },
    });
    expect(done.status).toBe(200);

    const read = await call(asHandler(getCompletions), { path: `/api/completions?routineId=${routineId}`, userId: id });
    expect(read.body.completions).toEqual([
      expect.objectContaining({ day_index: 0, exercise_index: 1, completed: true, actual_weight: 40, actual_reps: 8 }),
    ]);

    await call(asHandler(postCompletion), {
      method: "POST",
      path: "/api/completions",
      userId: id,
      body: { routineId, dayIndex: 0, exerciseIndex: 1, completed: false },
    });
    const after = await call(asHandler(getCompletions), { path: `/api/completions?routineId=${routineId}`, userId: id });
    expect(after.body.completions[0].completed).toBe(false);
  });

  it("only rest days (no exercises) can be marked complete as a whole day", async () => {
    const { id } = await newUser("cmp");
    const routineId = await save(id);
    const trainingDay = await call(asHandler(postDay), {
      method: "POST",
      path: "/api/day-completions",
      userId: id,
      body: { routineId, dayIndex: 0, completed: true },
    });
    expect(trainingDay).toMatchObject({ status: 403, body: { error: "Failed to update rest-day completion" } });

    const r = await call(asHandler(postDay), {
      method: "POST",
      path: "/api/day-completions",
      userId: id,
      body: { routineId, dayIndex: 1, completed: true },
    });
    expect(r.status).toBe(200);
    const days = await call(asHandler(getDays), { path: `/api/day-completions?routineId=${routineId}`, userId: id });
    expect(days.status).toBe(200);
    expect(JSON.stringify(days.body)).toContain('"completed":true');
  });

  it("requires routineId on GET", async () => {
    const { id } = await newUser("cmp");
    const r = await call(asHandler(getCompletions), { path: "/api/completions", userId: id });
    expect(r.status).toBe(400);
  });
});
