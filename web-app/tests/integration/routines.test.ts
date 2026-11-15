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

  describe("completions on another user's routine", () => {
    const REST_DAY_INDEX = 1; // ROUTINE day 1 has no exercises

    // The owner records real data first, so a missing ownership check would
    // visibly leak or overwrite it rather than return an empty result anyway.
    async function routineWithOwnerProgress() {
      const owner = await newUser("own");
      const attacker = await newUser("oth");
      const routineId = await save(owner.id);
      const recordExercise = await call(asHandler(postCompletion), {
        method: "POST",
        path: "/api/completions",
        userId: owner.id,
        body: { routineId, dayIndex: 0, exerciseIndex: 0, completed: true, actual_weight: 50, actual_reps: 10 },
      });
      expect(recordExercise.status).toBe(200);
      const recordRestDay = await call(asHandler(postDay), {
        method: "POST",
        path: "/api/day-completions",
        userId: owner.id,
        body: { routineId, dayIndex: REST_DAY_INDEX, completed: true },
      });
      expect(recordRestDay.status).toBe(200);
      return { owner, attacker, routineId };
    }

    it("cannot read the owner's exercise completions", async () => {
      const { attacker, routineId } = await routineWithOwnerProgress();
      const read = await call(asHandler(getCompletions), {
        path: `/api/completions?routineId=${routineId}`,
        userId: attacker.id,
      });
      expect(read.status).toBe(200);
      expect(read.body.completions).toEqual([]);
    });

    it("cannot read the owner's day completions", async () => {
      const { attacker, routineId } = await routineWithOwnerProgress();
      const read = await call(asHandler(getDays), {
        path: `/api/day-completions?routineId=${routineId}`,
        userId: attacker.id,
      });
      expect(read.status).toBe(200);
      expect(read.body.days).toEqual([]);
    });

    it("cannot change the owner's exercise or rest-day completions", async () => {
      const { owner, attacker, routineId } = await routineWithOwnerProgress();

      const exerciseWrite = await call(asHandler(postCompletion), {
        method: "POST",
        path: "/api/completions",
        userId: attacker.id,
        body: { routineId, dayIndex: 0, exerciseIndex: 0, completed: false },
      });
      expect(exerciseWrite.status).toBe(403);

      const restDayWrite = await call(asHandler(postDay), {
        method: "POST",
        path: "/api/day-completions",
        userId: attacker.id,
        body: { routineId, dayIndex: REST_DAY_INDEX, completed: false },
      });
      expect(restDayWrite.status).toBe(403);

      const ownerExercises = await call(asHandler(getCompletions), {
        path: `/api/completions?routineId=${routineId}`,
        userId: owner.id,
      });
      expect(ownerExercises.body.completions).toEqual([expect.objectContaining({ day_index: 0, exercise_index: 0, completed: true })]);
      const ownerDays = await call(asHandler(getDays), {
        path: `/api/day-completions?routineId=${routineId}`,
        userId: owner.id,
      });
      expect(ownerDays.body.days).toEqual([{ day_index: REST_DAY_INDEX, completed: true }]);
    });
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
