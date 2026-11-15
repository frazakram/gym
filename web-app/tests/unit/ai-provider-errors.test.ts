import { afterEach, describe, expect, it, vi } from "vitest";
import { APIConnectionTimeoutError } from "openai";
import { AI_PROVIDER_TIMEOUT_MESSAGE, UserFacingError, asAiProviderError, toPublicError } from "@/lib/api-errors";
import { generateDiet } from "@/lib/diet-agent";
import { generateRoutine } from "@/lib/ai-agent";
import { generateRoutineOpenAI } from "@/lib/openai-routine";
import type { Profile, RoutineGenerationInput } from "@/types";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const ROUTINE_INPUT = {
  age: 25,
  weight: 70,
  height: 175,
  gender: "Male",
  goal: "General fitness",
  level: "Beginner",
  tenure: "6 months",
  model_provider: "OpenAI",
} as unknown as RoutineGenerationInput;

describe("missing or malformed API keys are user-facing errors", () => {
  it("diet-agent: missing OpenAI key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const rejection = generateDiet({ profile: {} as Profile, model_provider: "OpenAI" } as never);
    await expect(rejection).rejects.toBeInstanceOf(UserFacingError);
    await expect(rejection).rejects.toThrow("OpenAI API key is required");
  });

  it("ai-agent: missing Anthropic key", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const rejection = generateRoutine({ ...ROUTINE_INPUT, model_provider: "Anthropic" } as RoutineGenerationInput);
    await expect(rejection).rejects.toBeInstanceOf(UserFacingError);
    await expect(rejection).rejects.toThrow("Anthropic API key is required");
  });

  it("openai-routine: malformed key", async () => {
    const rejection = generateRoutineOpenAI({ ...ROUTINE_INPUT, apiKey: "not-a-key" } as RoutineGenerationInput);
    await expect(rejection).rejects.toBeInstanceOf(UserFacingError);
    await expect(rejection).rejects.toThrow("OpenAI API key format looks invalid");
  });
});

describe("openai-routine: provider HTTP errors", () => {
  function stubOpenAiResponse(status: number, body: string) {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(body, { status }));
  }

  it("a rejected key becomes a friendly message without the provider's raw body", async () => {
    stubOpenAiResponse(401, '{"error":{"message":"Incorrect API key provided: sk-proj-****wxyz"}}');
    const error = await generateRoutineOpenAI({ ...ROUTINE_INPUT, apiKey: "sk-test-1234567890abc" } as RoutineGenerationInput)
      .then(() => null, (rejection: unknown) => rejection);

    const publicError = toPublicError(asAiProviderError(error));
    expect(publicError.status).toBe(502);
    expect(publicError.message).toBe("The AI provider rejected the API key. Check the key in AI Settings.");
    expect(publicError.message).not.toContain("sk-proj");
  });

  it("provider rate limiting becomes a 429 with a retry hint", async () => {
    stubOpenAiResponse(429, '{"error":{"message":"Rate limit reached for org-abc123"}}');
    const error = await generateRoutineOpenAI({ ...ROUTINE_INPUT, apiKey: "sk-test-1234567890abc" } as RoutineGenerationInput)
      .then(() => null, (rejection: unknown) => rejection);

    expect(toPublicError(asAiProviderError(error))).toEqual({
      status: 429,
      message: "The AI provider is rate limiting requests. Please try again in a minute.",
    });
  });
});

describe("toPublicError / asAiProviderError", () => {
  it("does not apply AI provider messages to errors outside AI calls", () => {
    const paymentSdkError = Object.assign(new Error("Not found: plan_xyz"), { status: 404 });
    expect(toPublicError(paymentSdkError)).toEqual({ status: 500, message: "Internal server error" });
  });

  it("hides unexpected errors behind a generic 500", () => {
    expect(toPublicError(new Error("connect ECONNREFUSED 10.0.0.5:5432"))).toEqual({
      status: 500,
      message: "Internal server error",
    });
  });

  it("tells the user when the chosen model is unavailable to their key", () => {
    const sdkError = Object.assign(new Error("404 The model `gpt-9` does not exist or you do not have access to it."), { status: 404 });
    expect(toPublicError(asAiProviderError(sdkError))).toEqual({
      status: 502,
      message: "The selected AI model is not available for this API key. Choose another model in AI Settings.",
    });
  });

  it("classifies LangChain/SDK errors by their status property", () => {
    const sdkError = Object.assign(new Error("401 Incorrect API key provided: sk-ant-****9xyz"), { status: 401 });
    const classified = asAiProviderError(sdkError);
    expect(toPublicError(classified).message).toBe("The AI provider rejected the API key. Check the key in AI Settings.");
    // The raw provider error stays attached for server-side logging.
    expect((classified as Error).cause).toBe(sdkError);
  });
});

describe("AI provider timeouts", () => {
  it.each([
    ["fetch with an outbound time limit", new DOMException("The operation was aborted due to timeout", "TimeoutError")],
    ["the OpenAI SDK timeout option", new APIConnectionTimeoutError()],
  ])("%s becomes a 504 with a retry message", (_source, timeoutError) => {
    expect(toPublicError(asAiProviderError(timeoutError))).toEqual({ status: 504, message: AI_PROVIDER_TIMEOUT_MESSAGE });
  });

  it("a user cancelling (AbortError) is not reported as a provider timeout", () => {
    const cancelled = new DOMException("This operation was aborted", "AbortError");
    expect(toPublicError(asAiProviderError(cancelled)).status).toBe(500);
  });
});
