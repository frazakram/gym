import { afterEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/types";

// What the stubbed model's invoke() should reject with.
const modelFailure = vi.hoisted(() => ({ error: new Error("unset") as unknown }));

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class {
    withStructuredOutput() {
      return {
        invoke: async () => {
          throw modelFailure.error;
        },
      };
    }
  },
}));

import { generateDiet } from "@/lib/diet-agent";
import { asAiProviderError, toPublicError } from "@/lib/api-errors";

const profile = { age: 30, weight: 70, height: 175, goal: "General fitness", level: "Beginner" } as unknown as Profile;
const request = () => generateDiet({ profile, model_provider: "OpenAI", apiKey: "sk-user-key-1234567890" } as never);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generateDiet error handling", () => {
  it("propagates provider HTTP errors so the route can tell the user what is wrong", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    modelFailure.error = Object.assign(new Error("401 Incorrect API key provided"), { status: 401 });

    const rejection = await request().then(() => null, (error: unknown) => error);

    expect(rejection).not.toBeNull();
    expect(toPublicError(asAiProviderError(rejection)).message).toBe(
      "The AI provider rejected the API key. Check the key in AI Settings.",
    );
  });

  it("still returns null for other failures (e.g. output that does not match the schema)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    modelFailure.error = new Error("Failed to parse structured output");

    await expect(request()).resolves.toBeNull();
  });
});
