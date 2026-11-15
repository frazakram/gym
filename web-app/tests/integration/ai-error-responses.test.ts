import { afterEach, describe, expect, it, vi } from "vitest";

const generatorFailure = vi.hoisted(() => ({ error: new Error("unset") as unknown }));
vi.mock("@/lib/diet-agent", () => ({
  generateDiet: async () => {
    throw generatorFailure.error;
  },
}));
vi.mock("@/lib/openai-routine", () => ({
  generateRoutineOpenAI: async () => {
    throw generatorFailure.error;
  },
}));

import { POST as generateDietRoute } from "@/app/api/diet/generate/route";
import { POST as generateRoutineRoute } from "@/app/api/routine/generate/route";
import { PUT as saveProfile } from "@/app/api/profile/route";
import { asHandler, call, newUser } from "./helpers";

const RAW_PROVIDER_MESSAGE = "401 Incorrect API key provided: sk-proj-****wxyz. You can find your key at platform.openai.com";

afterEach(() => {
  vi.restoreAllMocks();
});

async function userWithProfile() {
  const { id } = await newUser("aierr");
  const saved = await call(asHandler(saveProfile), {
    method: "PUT",
    path: "/api/profile",
    userId: id,
    body: { age: 25, weight: 70, height: 175, gender: "Male", goal: "General fitness", level: "Beginner", tenure: "6 months", cuisine: null, cooking_level: null, budget: null },
  });
  expect(saved.status).toBe(200);
  return id;
}

function generateDietAs(userId: number) {
  return call(asHandler(generateDietRoute), {
    method: "POST",
    path: "/api/diet/generate",
    userId,
    body: { model_provider: "OpenAI", api_key: "sk-user-own-key-123456" },
  });
}

describe("AI route error responses", () => {
  it("diet/generate: provider auth failure is friendly and does not echo the provider message", async () => {
    generatorFailure.error = Object.assign(new Error(RAW_PROVIDER_MESSAGE), { status: 401 });
    const response = await generateDietAs(await userWithProfile());
    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: "The AI provider rejected the API key. Check the key in AI Settings." });
  });

  it("diet/generate: unexpected failures return a generic 500", async () => {
    generatorFailure.error = new Error("connect ECONNREFUSED 10.0.0.5:5432");
    const response = await generateDietAs(await userWithProfile());
    expect(response).toMatchObject({ status: 500, body: { error: "Internal server error" } });
  });

  it("routine/generate stream: the error event carries only a safe message", async () => {
    generatorFailure.error = Object.assign(new Error(RAW_PROVIDER_MESSAGE), { status: 401 });
    const { id } = await newUser("aierr");
    const response = await call(asHandler(generateRoutineRoute), {
      method: "POST",
      path: "/api/routine/generate",
      userId: id,
      body: {
        age: 25, weight: 70, height: 175, gender: "Male", goal: "General fitness", level: "Beginner",
        tenure: "6 months", model_provider: "OpenAI", api_key: "sk-user-own-key-123456", stream: true,
      },
    });
    const stream = String(response.body);
    expect(stream).toContain("event: error");
    expect(stream).toContain("The AI provider rejected the API key. Check the key in AI Settings.");
    expect(stream).not.toContain("sk-proj");
  });
});
