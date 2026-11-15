import { afterEach, describe, expect, it, vi } from "vitest";
import type { Profile, RoutineGenerationInput } from "@/types";

// Records the model each ChatAnthropic is built with; the call itself stops there.
const constructed = vi.hoisted(() => ({ models: [] as string[] }));
const STOP = new Error("stop after construction");

vi.mock("@langchain/anthropic", () => ({
  ChatAnthropic: class {
    constructor(options: { model: string }) {
      constructed.models.push(options.model);
    }
    withStructuredOutput() {
      return { invoke: async () => { throw STOP; } };
    }
  },
}));

import { generateDiet } from "@/lib/diet-agent";
import { generateRoutine } from "@/lib/ai-agent";

// Retired by Anthropic on 2025-10-28: every request naming it fails.
const RETIRED_MODEL = "claude-3-5-sonnet-20241022";
const CURRENT_DEFAULT = "claude-sonnet-4-6";

const routineInput = (model?: string) =>
  ({ age: 25, weight: 70, height: 175, gender: "Male", goal: "General fitness", level: "Beginner",
     tenure: "6 months", model_provider: "Anthropic", apiKey: "sk-ant-test", model }) as unknown as RoutineGenerationInput;
const dietInput = (model?: string) =>
  ({ profile: { age: 30, weight: 70, height: 175, goal: "General fitness", level: "Beginner" } as unknown as Profile,
     model_provider: "Anthropic", apiKey: "sk-ant-test", model }) as never;

afterEach(() => {
  constructed.models = [];
  vi.restoreAllMocks();
});

describe.each([
  ["routine generation", (model?: string) => generateRoutine(routineInput(model))],
  ["diet generation", (model?: string) => generateDiet(dietInput(model))],
])("%s with Anthropic", (_name, generate) => {
  it.each([
    ["no model chosen", undefined, CURRENT_DEFAULT],
    ["a retired model saved in old settings", RETIRED_MODEL, CURRENT_DEFAULT],
    ["a current model", "claude-haiku-4-5-20251001", "claude-haiku-4-5-20251001"],
  ])("%s", async (_case, requested, expected) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await generate(requested).catch(() => {});
    expect(constructed.models[0]).toBe(expected);
    expect(constructed.models).not.toContain(RETIRED_MODEL);
  });
});
