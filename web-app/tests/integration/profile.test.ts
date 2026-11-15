import { describe, expect, it } from "vitest";
import { GET, PUT } from "@/app/api/profile/route";
import { asHandler, call, newUser } from "./helpers";

const get = (userId?: number) => call(asHandler(GET), { path: "/api/profile", userId });
const put = (userId: number | undefined, body: unknown, csrf = true) =>
  call(asHandler(PUT), { method: "PUT", path: "/api/profile", userId, body, csrf });

const FULL = {
  name: "Asha",
  age: 28,
  weight: 62.5,
  height: 165,
  gender: "Female",
  goal: "General fitness",
  level: "Beginner",
  tenure: "3 months",
  goal_weight: 58,
  notes: "Bad knee",
  cuisine: "North Indian",
  cooking_level: "Moderate",
  budget: "Standard",
  diet_type: ["Vegetarian"],
  allergies: ["Peanuts"],
  meals_per_day: 4,
  preferred_rest_days: ["Sun"],
  nationality: "IN",
};

describe("/api/profile", () => {
  it("returns profile null plus the username for a new user", async () => {
    const { id, username } = await newUser("prof");
    expect(await get(id)).toMatchObject({ status: 200, body: { profile: null, username } });
  });

  it("requires a session for GET and PUT", async () => {
    expect((await get()).status).toBe(401);
    expect((await put(undefined, FULL)).status).toBe(401);
  });

  it("requires a CSRF token for PUT", async () => {
    const { id } = await newUser("prof");
    const r = await put(id, FULL, false);
    expect(r).toMatchObject({ status: 403, body: { error: "Missing CSRF cookie" } });
  });

  it("validates input", async () => {
    const { id } = await newUser("prof");
    const r = await put(id, { ...FULL, age: 9 });
    expect(r.status).toBe(400);
    expect(r.body.error).toContain("age: Age must be at least 13");
  });

  it("creates then reads back a full profile, deriving region from nationality", async () => {
    const { id } = await newUser("prof");
    expect((await put(id, FULL)).status).toBe(200);

    const { body } = await get(id);
    expect(body.profile).toMatchObject({
      user_id: id,
      name: "Asha",
      age: 28,
      gender: "Female",
      goal: "General fitness",
      level: "Beginner",
      cuisine: "North Indian",
      diet_type: ["Vegetarian"],
      allergies: ["Peanuts"],
      meals_per_day: 4,
      preferred_rest_days: ["Sun"],
      nationality: "IN",
      region: "APAC",
    });
    // DECIMAL columns come back from Postgres as strings (current behaviour).
    expect(Number(body.profile.weight)).toBe(62.5);
  });

  it("partial update keeps fields that were not sent; null clears a field", async () => {
    const { id } = await newUser("prof");
    await put(id, FULL);
    expect((await put(id, { cuisine: null, cooking_level: null, budget: null, notes: null })).status).toBe(200);

    const { body } = await get(id);
    expect(body.profile.age).toBe(28);
    expect(body.profile.name).toBe("Asha");
    expect(body.profile.cuisine).toBeNull();
    expect(body.profile.notes).toBeNull();
  });

  it("isolates profiles between users", async () => {
    const a = await newUser("prof");
    const b = await newUser("prof");
    await put(a.id, FULL);
    expect((await get(b.id)).body.profile).toBeNull();
  });
});
