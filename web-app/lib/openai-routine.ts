import { z } from "zod";
import { ProxyAgent } from "undici";
import type { RoutineGenerationInput, WeeklyRoutine } from "@/types";
import { postProcessRoutine } from "@/lib/routine-postprocess";

const ExerciseSchema = z.object({
  name: z.string(),
  sets_reps: z.string(),
  youtube_urls: z.array(z.string()).min(0).max(3),
  tutorial_points: z.array(z.string()).min(3).max(5),
  wikihow_url: z.string().optional(),
});

const DayRoutineSchema = z.object({
  day: z.string(),
  exercises: z.array(ExerciseSchema),
});

const WeeklyRoutineSchema = z.object({
  days: z.array(DayRoutineSchema),
});

function buildPrompt(input: RoutineGenerationInput): string {
  const normalizedHeight =
    typeof input.height === "number" && input.height > 0 && input.height <= 8
      ? Math.round(input.height * 30.48 * 10) / 10
      : input.height;

  return `You are an expert personal trainer and strength coach. Create a realistic, safe, and highly personalized 7-day gym routine that a good trainer would recommend after assessing the client.

Client Profile (use ALL of these when deciding exercise selection, volume, intensity, rest, and progression):
- Age: ${input.age} years
- Current weight: ${input.weight} kg
- Height: ${normalizedHeight} cm
- Gender: ${input.gender}
- Primary goal: ${input.goal}
${typeof input.goal_weight === "number" ? `- Goal weight: ${input.goal_weight} kg` : ""}
- Experience level: ${input.level}
- Training history/duration: ${input.tenure}
${input.notes && input.notes.trim() ? `- Additional comments/constraints: ${input.notes.trim()}` : ""}

Requirements (very important):
- Choose a split appropriate for the client's goal + level (e.g., 3–6 training days/week + rest days as needed).
- Adjust volume and intensity to match goal:
  - Fat loss: include appropriate cardio/conditioning and keep strength work to preserve muscle.
  - Muscle gain: prioritize progressive overload, sufficient weekly volume, and recovery.
  - Strength: emphasize heavy compound lifts with appropriate accessory work and longer rest.
  - Recomposition: balanced hypertrophy + strength, moderate volume, sustainable intensity.
  - Endurance: strength maintenance + higher conditioning; manage fatigue.
  - General fitness: balanced full-body or upper/lower, moderate volume and conditioning.
- If comments mention injuries/pain/equipment limits, avoid aggravating movements and propose safe substitutions.
- Use realistic set/rep prescriptions and rest times (include rest in sets_reps text if helpful).
- Make the plan coherent across the week (no repeating heavy stress on same joints without recovery).
- Provide at least 1 rest/recovery day unless the client is advanced AND notes explicitly ask otherwise.

Output format rules:
- Return ONLY JSON, no markdown fences, no extra text.
- The JSON must match this schema:
{
  "days": [
    {
      "day": "Monday - Chest & Triceps",
      "exercises": [
        {
          "name": "Exercise name",
          "sets_reps": "3 sets x 10 reps (rest 90s)",
          "youtube_urls": ["https://www.youtube.com/watch?v=..."],
          "tutorial_points": ["Point 1", "Point 2", "Point 3", "Point 4 (optional)", "Point 5 (optional)"],
          "wikihow_url": "https://www.wikihow.com/..."
        }
      ]
    }
  ]
}
- Provide 1-3 REAL, currently available YouTube URLs from reputable channels (if available) like Athlean-X, Jeff Nippard, Jeremy Ethier, ScottHermanFitness. Ensure the videos exist.
- Provide 3-5 tutorial_points per exercise (MIN 3, MAX 5). Keep them short and practical (setup, execution cues, mistakes to avoid).
- Only return YouTube URLs from youtube.com or youtu.be (no other domains). If you're not sure a valid YouTube video exists, return an empty array for youtube_urls.
- Provide a REAL, working WikiHow tutorial URL for each exercise if one exists.

Return the complete weekly routine as JSON.`;
}

function coerceJsonObject(text: string): unknown {
  const trimmed = text.trim();
  // Sometimes models accidentally wrap with ```json ... ```
  const unfenced = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(unfenced);
}

function toHelpfulNetworkErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const anyErr = err as { cause?: unknown; code?: string } | null;
  const cause = anyErr?.cause as { code?: string; message?: string } | null;

  const code = anyErr?.code || cause?.code;
  const causeMsg = cause?.message;

  if (code) {
    const extra =
      code === "ECONNRESET"
        ? "This is commonly caused by a corporate firewall/proxy resetting TLS. If you're on a company network, try setting OPENAI_PROXY/HTTPS_PROXY or using a different network."
        : "";
    return `Connection error (${code}). ${causeMsg || message}${extra ? ` ${extra}` : ""}`;
  }
  return message || "Connection error.";
}

function sanitizeApiKey(raw: string): string {
  // Normalize and remove common invisible chars that sneak in via copy/paste
  return raw
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width chars
    .trim();
}

function assertValidOpenAIApiKey(apiKey: string) {
  // Header values must be ByteString; enforce ASCII to avoid undici "ByteString" errors.
  if (!/^[\x20-\x7E]+$/.test(apiKey)) {
    throw new Error(
      "OpenAI API key contains invalid characters. Please paste only the raw key (no extra symbols/spaces)."
    );
  }

  // Basic format check (not too strict, but catches obvious mistakes)
  if (!/^sk-[A-Za-z0-9_-]{10,}$/.test(apiKey)) {
    throw new Error("OpenAI API key format looks invalid. It should start with 'sk-'.");
  }
}

function getProxyDispatcher(): ProxyAgent | undefined {
  // Prefer OPENAI_PROXY, fall back to standard envs
  const proxyUrl =
    process.env.OPENAI_PROXY ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy;

  if (!proxyUrl) return undefined;
  return new ProxyAgent(proxyUrl);
}

function isRetryableNetworkError(err: unknown): boolean {
  const anyErr = err as { cause?: unknown; code?: string; name?: string; message?: string } | null;
  const cause = anyErr?.cause as { code?: string; name?: string; message?: string } | null;
  const code = anyErr?.code || cause?.code;
  const name = anyErr?.name || cause?.name;
  const message = String(anyErr?.message || cause?.message || "");

  // AbortError means timeout from AbortController
  if (name === "AbortError") return true;
  if (!code) return false;
  return (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN" ||
    code === "ECONNREFUSED" ||
    message.toLowerCase().includes("socket") ||
    message.toLowerCase().includes("connection")
  );
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export async function generateRoutineOpenAI(input: RoutineGenerationInput): Promise<WeeklyRoutine> {
  const apiKey = sanitizeApiKey(input.apiKey || process.env.OPENAI_API_KEY || "");
  if (!apiKey) throw new Error("OpenAI API key is required");
  assertValidOpenAIApiKey(apiKey);

  const baseURL = (process.env.OPENAI_BASE_URL || "https://api.openai.com").replace(/\/+$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o";
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 120_000);
  const dispatcher = getProxyDispatcher();

  const maxAttempts = Number(process.env.OPENAI_RETRY_ATTEMPTS || 2);
  let lastErr: unknown;

  for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      Number.isFinite(timeoutMs) ? timeoutMs : 120_000
    );

    try {
      const res = await fetch(`${baseURL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: buildPrompt(input) }],
        }),
        signal: controller.signal,
        // undici fetch supports dispatcher (Node/Next runtime); TS doesn't include it in RequestInit.
        ...(dispatcher ? ({ dispatcher } as any) : null),
      } as any);

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`OpenAI HTTP ${res.status}: ${text || res.statusText}`);
      }

      const data = (await res.json()) as any;
      const content: string | undefined = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error("OpenAI response missing content");

      const parsed = coerceJsonObject(content);
      const validated = WeeklyRoutineSchema.parse(parsed);
      return postProcessRoutine(validated as WeeklyRoutine);
    } catch (err: unknown) {
      lastErr = err;
      if (attempt >= maxAttempts || !isRetryableNetworkError(err)) break;
      await sleep(500 * attempt);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(toHelpfulNetworkErrorMessage(lastErr));
}


