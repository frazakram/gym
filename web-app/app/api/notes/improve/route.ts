import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ChatAnthropic } from "@langchain/anthropic";

function sanitizeApiKey(raw: string): string {
  return String(raw || "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

function assertAsciiHeaderValue(value: string) {
  if (!/^[\x20-\x7E]+$/.test(value)) {
    throw new Error("API key contains invalid characters. Please paste only the raw key.");
  }
}

function extractText(out: unknown): string {
  const anyOut = out as any;
  const content = anyOut?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    // Anthropic can return array of blocks
    const texts = content.map((b: any) => (typeof b?.text === "string" ? b.text : "")).filter(Boolean);
    return texts.join("\n").trim();
  }
  return String(anyOut ?? "").trim();
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const {
      notes,
      model_provider,
      api_key,
      apiKey, // alt/backward name
    } = body ?? {};

    const provider = model_provider as "Anthropic" | "OpenAI" | undefined;
    if (provider !== "Anthropic" && provider !== "OpenAI") {
      return NextResponse.json({ error: "Invalid model_provider" }, { status: 400 });
    }

    const keyFromClientRaw = typeof api_key === "string" ? api_key : typeof apiKey === "string" ? apiKey : "";
    const keyFromClient = sanitizeApiKey(keyFromClientRaw);

    const hasServerKey =
      provider === "Anthropic" ? Boolean(process.env.ANTHROPIC_API_KEY) : Boolean(process.env.OPENAI_API_KEY);

    if (!keyFromClient && !hasServerKey) {
      return NextResponse.json(
        { error: `${provider} API key is required (enter it in the UI, or set it in server env)` },
        { status: 400 }
      );
    }

    const userNotes = typeof notes === "string" ? notes : "";

    const prompt = `You are helping a user write "Additional comments" for a gym routine generator.
Rewrite the notes to be clearer and more actionable for a coach/AI.

Rules:
- Keep the user's intent and facts. Do NOT invent injuries/equipment/availability.
- If the notes are empty, generate a short template asking for: injuries, equipment, days/week, preferences, constraints.
- Prefer concise bullet points.
- Keep it under 600 characters.
- Return ONLY the rewritten notes text (no markdown fences, no extra commentary).

Original notes:
${userNotes}`.trim();

    if (provider === "Anthropic") {
      const anthropicKey = keyFromClient || process.env.ANTHROPIC_API_KEY || "";
      if (keyFromClient) assertAsciiHeaderValue(anthropicKey);

      const model = new ChatAnthropic({
        model: "claude-3-5-sonnet-20241022",
        temperature: 0.3,
        apiKey: anthropicKey,
      });

      const out = await model.invoke([{ role: "user", content: prompt }] as any);
      const improved = extractText(out).trim();
      if (!improved) throw new Error("No improved notes returned.");
      return NextResponse.json({ notes: improved }, { status: 200 });
    }

    // OpenAI
    const openaiKey = keyFromClient || process.env.OPENAI_API_KEY || "";
    if (keyFromClient) assertAsciiHeaderValue(openaiKey);

    const baseURL = (process.env.OPENAI_BASE_URL || "https://api.openai.com").replace(/\/+$/, "");
    const model = process.env.OPENAI_MODEL_NOTES || process.env.OPENAI_MODEL || "gpt-4o-mini";

    const res = await fetch(`${baseURL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Return a JSON object with exactly one key: notes (string).",
          },
          { role: "user", content: prompt },
        ],
      }),
    } as any);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenAI HTTP ${res.status}: ${text || res.statusText}`);
    }

    const data = (await res.json()) as any;
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI response missing content");
    let improved = "";
    try {
      const parsed = JSON.parse(content);
      improved = typeof parsed?.notes === "string" ? parsed.notes : "";
    } catch {
      improved = content;
    }
    improved = String(improved || "").trim();
    if (!improved) throw new Error("No improved notes returned.");
    return NextResponse.json({ notes: improved }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message || "Internal server error" }, { status: 500 });
  }
}


