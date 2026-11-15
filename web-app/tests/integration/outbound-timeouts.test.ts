import { afterEach, describe, expect, it, vi } from "vitest";

// Shrink the limits so a hung provider is detected in milliseconds.
vi.mock("@/lib/outbound-timeouts", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/outbound-timeouts")>();
  return { ...original, outboundTimeout: () => AbortSignal.timeout(200) };
});

import { POST as gymAnalyze } from "@/app/api/gym/analyze/route";
import { POST as improveNotes } from "@/app/api/notes/improve/route";
import { asHandler, call, newUser } from "./helpers";

/** A provider that accepts every request and never answers (honours abort). */
function stubHangingProvider() {
  vi.stubGlobal("fetch", (_url: unknown, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
    }),
  );
}

const TIMEOUT_MESSAGE = "The AI provider took too long to respond. Please try again.";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("a hung AI provider", () => {
  it("gym equipment analysis answers 504 instead of hanging", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { id } = await newUser("hunggym");
    stubHangingProvider();
    const response = await call(asHandler(gymAnalyze), {
      method: "POST",
      path: "/api/gym/analyze",
      userId: id,
      body: { images: ["data:image/png;base64,AA=="], api_key: "sk-user-own-key" },
    });
    expect(response).toMatchObject({ status: 504, body: { error: TIMEOUT_MESSAGE } });
  }, 5_000);

  it("note improvement answers 504 instead of hanging", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { id } = await newUser("hungnotes");
    stubHangingProvider();
    const response = await call(asHandler(improveNotes), {
      method: "POST",
      path: "/api/notes/improve",
      userId: id,
      body: { notes: "felt strong on squats today", model_provider: "OpenAI", apiKey: "sk-user-own-key" },
    });
    expect(response).toMatchObject({ status: 504, body: { error: TIMEOUT_MESSAGE } });
  }, 5_000);
});
