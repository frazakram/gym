import { afterEach, describe, expect, it, vi } from "vitest";
import { generateDiet } from "@/lib/diet-agent";
import type { Profile } from "@/types";

// Runs diet generation through the real LangChain + provider SDK stack
// against a fake provider (global fetch), so a library upgrade that changes
// the request format or how structured output is parsed fails here. No real
// AI call, no key needed.

const MEAL = { name: "Breakfast", calories: 500, protein: 30, carbs: 50, fats: 15, ingredients: "Oats, milk" };
const PLAN = {
  days: Array.from({ length: 7 }, (_, index) => ({
    day: `Day ${index + 1}`, meals: [MEAL], total_calories: 500, total_protein: 30,
  })),
};

type CapturedRequest = { url: string; body: Record<string, unknown> };

/** Answers like the provider would, for tool calling or JSON-schema output. */
function stubProvider(provider: "openai" | "anthropic"): CapturedRequest[] {
  const captured: CapturedRequest[] = [];
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const body = JSON.parse(String(init?.body ?? (input instanceof Request ? await input.text() : "{}")));
    captured.push({ url, body });
    const tools = (body.tools ?? []) as Array<{ name?: string; function?: { name: string } }>;
    const json = (payload: unknown) => new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } });

    if (provider === "openai") {
      const toolName = tools[0]?.function?.name;
      const message = toolName
        ? { role: "assistant", content: null, tool_calls: [{ id: "call_1", type: "function", function: { name: toolName, arguments: JSON.stringify(PLAN) } }] }
        : { role: "assistant", content: JSON.stringify(PLAN) };
      return json({ id: "chatcmpl-1", object: "chat.completion", created: 0, model: body.model,
        choices: [{ index: 0, message, finish_reason: toolName ? "tool_calls" : "stop" }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } });
    }
    const toolName = tools[0]?.name;
    const content = toolName
      ? [{ type: "tool_use", id: "toolu_1", name: toolName, input: PLAN }]
      : [{ type: "text", text: JSON.stringify(PLAN) }];
    return json({ id: "msg_1", type: "message", role: "assistant", model: body.model, content,
      stop_reason: toolName ? "tool_use" : "end_turn", usage: { input_tokens: 1, output_tokens: 1 } });
  });
  return captured;
}

const profile = { age: 30, weight: 70, height: 175, gender: "Male", goal: "General fitness", level: "Beginner" } as unknown as Profile;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe.each([
  ["openai", "OpenAI", "sk-test-1234567890abcdef", "api.openai.com/v1/chat/completions", "gpt-4o"],
  ["anthropic", "Anthropic", "sk-ant-test-1234567890", "api.anthropic.com/v1/messages", "claude-sonnet-4-6"],
] as const)("diet generation through LangChain (%s)", (provider, modelProvider, apiKey, endpoint, model) => {
  it("sends the request to the provider and returns the parsed 7-day plan", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const captured = stubProvider(provider);

    const diet = await generateDiet({ profile, model_provider: modelProvider, apiKey } as never);

    expect(captured).toHaveLength(1);
    expect(captured[0].url).toContain(endpoint);
    expect(captured[0].body.model).toBe(model);
    expect(diet?.days).toHaveLength(7);
    expect(diet?.days[0].meals[0]).toMatchObject(MEAL);
  });
});
