import { afterEach, describe, expect, it, vi } from "vitest";

// Record every OpenAI SDK call; return a valid body-analysis JSON.
const openAiCallCounter = vi.hoisted(() => ({ count: 0 }));
vi.mock("openai", () => ({
  default: class {
    chat = {
      completions: {
        create: async () => {
          openAiCallCounter.count += 1;
          return {
            choices: [{ message: { content: JSON.stringify({ body_type: "average", overall_assessment: "ok" }) } }],
          };
        },
      },
    };
  },
}));

import { POST as bodyAnalyze } from "@/app/api/body/analyze/route";
import { POST as gymAnalyze } from "@/app/api/gym/analyze/route";
import { asHandler, call, newUser } from "./helpers";

const TINY_PNG_DATA_URL = "data:image/png;base64,iVBORw0KGgo=";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  openAiCallCounter.count = 0;
});

// Production with the server's OpenAI key and no Redis: the cost guard must
// refuse before any paid call is made.
function simulateProductionWithServerKeyAndNoRedis() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("OPENAI_API_KEY", "sk-server-test");
}

describe("paid AI endpoints fail closed without a rate limiter in production", () => {
  it("body/analyze returns 503 and never calls OpenAI", async () => {
    simulateProductionWithServerKeyAndNoRedis();
    const { id } = await newUser("ai");
    const response = await call(asHandler(bodyAnalyze), {
      method: "POST",
      path: "/api/body/analyze",
      userId: id,
      body: { images: [TINY_PNG_DATA_URL] },
    });
    expect(response.status).toBe(503);
    expect(response.res.headers.get("Retry-After")).toBe("60");
    expect(openAiCallCounter.count).toBe(0);
  });

  it("gym/analyze returns 503 and never calls OpenAI", async () => {
    simulateProductionWithServerKeyAndNoRedis();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { id } = await newUser("ai");
    const response = await call(asHandler(gymAnalyze), {
      method: "POST",
      path: "/api/gym/analyze",
      userId: id,
      body: { images: [TINY_PNG_DATA_URL] },
    });
    expect(response.status).toBe(503);
    expect(fetchSpy.mock.calls.some(([requestUrl]) => String(requestUrl).includes("api.openai.com"))).toBe(false);
  });

  it("does not limit users who bring their own OpenAI key", async () => {
    simulateProductionWithServerKeyAndNoRedis();
    const { id } = await newUser("ai");
    const response = await call(asHandler(bodyAnalyze), {
      method: "POST",
      path: "/api/body/analyze",
      userId: id,
      body: { images: [TINY_PNG_DATA_URL], api_key: "sk-user-own-key" },
    });
    expect(response.status).toBe(200);
    expect(openAiCallCounter.count).toBe(1);
  });
});
