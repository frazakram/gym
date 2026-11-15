import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/openai-routine", () => ({
  generateRoutineOpenAI: async () => ({
    days: [{ day: "Monday - Full Body", exercises: [{ name: "Squat", sets_reps: "3 x 10", youtube_urls: [] }] }],
  }),
}));

import { POST as generateRoutine } from "@/app/api/routine/generate/route";
import { asHandler, call, newUser } from "./helpers";

const USER_API_KEY = "sk-proj-UNIQUEPREFIX0123456789-UNIQUESUFFIX9876";
const KEY_FRAGMENTS = [USER_API_KEY.slice(0, 6), USER_API_KEY.slice(-4), USER_API_KEY];

afterEach(() => {
  vi.restoreAllMocks();
});

function captureConsoleOutput(): () => string {
  const logged: unknown[][] = [];
  for (const method of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      logged.push(args);
    });
  }
  return () => logged.map((args) => args.map(String).join(" ")).join("\n");
}

describe("POST /api/routine/generate logging", () => {
  it("never writes any part of a user-supplied API key to the logs", async () => {
    const readConsoleOutput = captureConsoleOutput();
    const { id } = await newUser("keylog");

    const response = await call(asHandler(generateRoutine), {
      method: "POST",
      path: "/api/routine/generate",
      userId: id,
      body: {
        age: 25,
        weight: 70,
        height: 175,
        gender: "Male",
        goal: "General fitness",
        level: "Beginner",
        tenure: "6 months",
        model_provider: "OpenAI",
        api_key: USER_API_KEY,
        stream: true,
      },
    });

    // The streaming path (where the key used to be logged) really ran.
    expect(response.status).toBe(200);
    expect(String(response.body)).toContain("event: routine");

    const consoleOutput = readConsoleOutput();
    expect(consoleOutput).toContain("[Routine SSE]");
    for (const fragment of KEY_FRAGMENTS) {
      expect(consoleOutput).not.toContain(fragment);
    }
  });
});
