import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "pg";
import { GET as getProfile, PUT as putProfile } from "@/app/api/profile/route";
import { GET as getBodyPhotosRoute } from "@/app/api/body/photos/route";
import { hasBodyPhotos } from "@/lib/db";
import { asHandler, call, newUser } from "./helpers";

const ENCRYPTION_KEY = "0123456789abcdef".repeat(4);
const PHOTO_PAYLOAD = "iVBORw0KGgoAAAANSUhEUgBODYPHOTOPAYLOAD";
const PHOTOS = [{ id: "p1", base64: `data:image/png;base64,${PHOTO_PAYLOAD}`, uploaded_at: "2026-11-15T00:00:00.000Z" }];
const BASE_PROFILE = { age: 30, weight: 70, height: 175, gender: "Male", goal: "General fitness", level: "Beginner", tenure: "1 year", cuisine: null, cooking_level: null, budget: null };

async function rawBodyPhotosColumn(userId: number): Promise<unknown> {
  const db = new Client({ connectionString: process.env.POSTGRES_URL });
  await db.connect();
  try {
    return (await db.query("SELECT body_photos FROM profiles WHERE user_id = $1", [userId])).rows[0]?.body_photos;
  } finally {
    await db.end();
  }
}

async function setRawBodyPhotosColumn(userId: number, value: unknown) {
  const db = new Client({ connectionString: process.env.POSTGRES_URL });
  await db.connect();
  await db.query("UPDATE profiles SET body_photos = $2::jsonb WHERE user_id = $1", [userId, JSON.stringify(value)]);
  await db.end();
}

const saveProfile = (userId: number, body: unknown) =>
  call(asHandler(putProfile), { method: "PUT", path: "/api/profile", userId, body });
const fetchPhotos = (userId?: number) => call(asHandler(getBodyPhotosRoute), { path: "/api/body/photos", userId });

beforeEach(() => {
  vi.stubEnv("DB_ENCRYPTION_KEY", ENCRYPTION_KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("body photos", () => {
  it("are encrypted at rest", async () => {
    const { id } = await newUser("photos");
    expect((await saveProfile(id, { ...BASE_PROFILE, body_photos: PHOTOS })).status).toBe(200);

    const stored = await rawBodyPhotosColumn(id);
    expect(typeof stored).toBe("string");
    expect(String(stored).startsWith("enc:")).toBe(true);
    expect(JSON.stringify(stored)).not.toContain(PHOTO_PAYLOAD);
  });

  it("are not included in profile responses", async () => {
    const { id } = await newUser("photos");
    const saved = await saveProfile(id, { ...BASE_PROFILE, body_photos: PHOTOS });
    expect(saved.body.profile).not.toHaveProperty("body_photos");

    const fetched = await call(asHandler(getProfile), { path: "/api/profile", userId: id });
    expect(fetched.status).toBe(200);
    expect(fetched.body.profile).not.toHaveProperty("body_photos");
    expect(JSON.stringify(fetched.body)).not.toContain(PHOTO_PAYLOAD);
  });

  it("are served decrypted, only to their owner, by GET /api/body/photos", async () => {
    const owner = await newUser("photos");
    const other = await newUser("photos");
    await saveProfile(owner.id, { ...BASE_PROFILE, body_photos: PHOTOS });

    expect(await fetchPhotos(owner.id)).toMatchObject({ status: 200, body: { body_photos: PHOTOS } });
    expect(await fetchPhotos(other.id)).toMatchObject({ status: 200, body: { body_photos: [] } });
    expect((await fetchPhotos()).status).toBe(401);
  });

  it("survive a profile save that does not include them, and null clears them", async () => {
    const { id } = await newUser("photos");
    await saveProfile(id, { ...BASE_PROFILE, body_photos: PHOTOS });

    expect((await saveProfile(id, { name: "Renamed", cuisine: null, cooking_level: null, budget: null })).status).toBe(200);
    expect((await fetchPhotos(id)).body.body_photos).toEqual(PHOTOS);

    await saveProfile(id, { body_photos: null, cuisine: null, cooking_level: null, budget: null });
    expect((await fetchPhotos(id)).body.body_photos).toEqual([]);
  });

  it("migrates legacy plaintext photos: served as before and re-encrypted on read", async () => {
    const { id } = await newUser("photos");
    await saveProfile(id, BASE_PROFILE);
    await setRawBodyPhotosColumn(id, PHOTOS);

    expect((await fetchPhotos(id)).body.body_photos).toEqual(PHOTOS);
    expect(String(await rawBodyPhotosColumn(id)).startsWith("enc:")).toBe(true);
  });

  it("are still detected by hasBodyPhotos when encrypted", async () => {
    const { id } = await newUser("photos");
    expect(await hasBodyPhotos(id)).toBe(false);
    await saveProfile(id, { ...BASE_PROFILE, body_photos: PHOTOS });
    expect(await hasBodyPhotos(id)).toBe(true);
  });
});
