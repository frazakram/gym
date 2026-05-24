import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { Client } from "langsmith";
import { getSession } from "@/lib/auth";
import { initializeDatabase, getProfile } from "@/lib/db";
import { requireCsrf } from "@/lib/csrf";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeUntrustedText, escapeForPrompt } from "@/lib/prompt-safety";
import { redisGetJson, redisSetJson } from "@/lib/redis";
import { safeParseWithError } from "@/lib/validations";
import {
  getExerciseMuscleInfo,
  muscleLabel,
  type ExerciseMuscleInfo,
  type MuscleGroup,
  type BodyRegion,
} from "@/lib/exercise-muscles";

export const runtime = "nodejs";

// ===================== TTLs =====================
const GLOBAL_CACHE_TTL = 60 * 60 * 24 * 30; // 30 days — exercise facts don't change
const PERSONAL_CACHE_TTL = 60 * 60 * 24 * 7; // 7 days — re-personalize if body analysis updates
const CACHE_VERSION = "v1";

// ===================== Schemas =====================
const RequestSchema = z.object({
  exerciseName: z.string().min(1).max(120),
});

const MuscleEnum = z.enum([
  "chest",
  "upper_back",
  "lower_back",
  "lats",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "obliques",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
  "adductors",
  "traps",
  "neck",
  "cardio",
]);

const RegionEnum = z.enum([
  "chest",
  "back",
  "shoulders",
  "arms",
  "core",
  "legs",
  "full_body",
  "cardio",
]);

const GlobalAISchema = z.object({
  primary: z.array(MuscleEnum).min(0).max(6),
  secondary: z.array(MuscleEnum).min(0).max(6),
  region: RegionEnum,
  benefits: z.array(z.string().min(4).max(140)).min(2).max(5),
});

const PersonalAISchema = z.object({
  personal_note: z.string().min(10).max(280),
  matched_focus_areas: z.array(z.string().min(1).max(80)).max(5),
});

type GlobalInfo = z.infer<typeof GlobalAISchema>;
type PersonalInfo = z.infer<typeof PersonalAISchema>;

interface ResponseShape {
  exerciseName: string;
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  region: BodyRegion;
  benefits: string[];
  personalNote?: string;
  matchedFocusAreas?: string[];
  source: "ai" | "static" | "mixed";
  cached: { global: boolean; personal: boolean };
}

// ===================== Helpers =====================
function normalizeExerciseName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

function staticToGlobalShape(info: ExerciseMuscleInfo): GlobalInfo {
  return {
    primary: info.primary,
    secondary: info.secondary,
    region: info.region,
    benefits: info.benefits.length >= 2 ? info.benefits : [...info.benefits, "Improves overall fitness"],
  };
}

function getLangSmithClient(): Client | null {
  if (!process.env.LANGSMITH_API_KEY || process.env.LANGSMITH_TRACING_V2 !== "true") return null;
  return new Client({ apiKey: process.env.LANGSMITH_API_KEY });
}

// ===================== AI calls =====================
async function callOpenAIJson<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodSchema<T>,
  traceName: string
): Promise<T | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL_EXERCISE_INFO || "gpt-4o-mini";
  const langsmith = getLangSmithClient();
  const project = process.env.LANGSMITH_PROJECT ?? "gym-bro-prod";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  const runId = langsmith ? crypto.randomUUID() : undefined;
  const startTime = Date.now();
  if (langsmith && runId) {
    await langsmith
      .createRun({
        id: runId,
        name: traceName,
        run_type: "llm",
        inputs: { messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] },
        extra: {
          invocation_params: { model, temperature: 0.2 },
          metadata: { ls_provider: "openai", ls_model_name: model, ls_model_type: "chat", ls_temperature: 0.2 },
        },
        project_name: project,
        start_time: startTime,
      })
      .catch(() => {});
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      if (langsmith && runId) {
        await langsmith.updateRun(runId, { end_time: Date.now(), error: `HTTP ${res.status}` }).catch(() => {});
      }
      return null;
    }

    const json: any = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    const usage = json?.usage;

    let parsedRaw: unknown;
    try {
      parsedRaw = JSON.parse(content);
    } catch {
      if (langsmith && runId) {
        await langsmith.updateRun(runId, { end_time: Date.now(), error: "invalid JSON" }).catch(() => {});
      }
      return null;
    }

    const result = schema.safeParse(parsedRaw);
    if (langsmith && runId) {
      const outputs: Record<string, unknown> = {
        usage_metadata: usage
          ? {
              input_tokens: usage.prompt_tokens,
              output_tokens: usage.completion_tokens,
              total_tokens: usage.total_tokens,
            }
          : undefined,
        generations: [
          {
            text: content,
            message: {
              role: "assistant",
              content,
              usage_metadata: usage
                ? {
                    input_tokens: usage.prompt_tokens,
                    output_tokens: usage.completion_tokens,
                    total_tokens: usage.total_tokens,
                  }
                : undefined,
            },
          },
        ],
      };
      await langsmith
        .updateRun(runId, {
          end_time: Date.now(),
          outputs,
          error: result.success ? undefined : "schema validation failed",
        })
        .catch(() => {});
    }

    if (!result.success) return null;
    return result.data;
  } catch {
    if (langsmith && runId) {
      await langsmith.updateRun(runId, { end_time: Date.now(), error: "request failed" }).catch(() => {});
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function getGlobalInfo(exerciseName: string): Promise<{ info: GlobalInfo; cached: boolean; source: "ai" | "static" }> {
  const normalized = normalizeExerciseName(exerciseName);
  const cacheKey = `exinfo:global:${CACHE_VERSION}:${shortHash(normalized)}`;

  const cached = await redisGetJson<GlobalInfo>(cacheKey);
  if (cached) {
    console.log(`[Cache HIT] ${cacheKey}`);
    return { info: cached, cached: true, source: "ai" };
  }
  console.log(`[Cache MISS] ${cacheKey}`);

  const safe = escapeForPrompt(sanitizeUntrustedText(exerciseName, { maxChars: 120 }));
  const systemPrompt = `You are a certified strength and conditioning coach. For a given exercise name, return a strict JSON object describing which muscles it works and its objective benefits. Be conservative — only include muscles the exercise genuinely targets.

Output JSON schema (return ONLY this JSON, no commentary):
{
  "primary": string[]  // 1-3 muscle slugs from the enum
  "secondary": string[] // 0-4 muscle slugs from the enum
  "region": string // one body-region slug from the enum
  "benefits": string[] // 2-4 short objective benefit sentences (max 140 chars each)
}

Allowed muscle slugs: chest, upper_back, lower_back, lats, shoulders, biceps, triceps, forearms, abs, obliques, glutes, quads, hamstrings, calves, adductors, traps, neck, cardio.
Allowed region slugs: chest, back, shoulders, arms, core, legs, full_body, cardio.

Benefit sentences must be objective, factual, and exercise-specific (not generic motivational text). No emojis, no second person ("you"). Examples:
- "Builds upper-chest mass for a fuller pressing shelf."
- "Strengthens the hip hinge — protects the lower back when lifting."
If the exercise name is unrecognizable or made up, still pick the closest match and reduce confidence by returning shorter lists.`;

  const userPrompt = `Exercise name: ${safe}`;
  const ai = await callOpenAIJson(systemPrompt, userPrompt, GlobalAISchema, `exerciseInfo.global:${normalized.slice(0, 40)}`);
  if (!ai) {
    return { info: staticToGlobalShape(getExerciseMuscleInfo(exerciseName)), cached: false, source: "static" };
  }

  await redisSetJson(cacheKey, ai, GLOBAL_CACHE_TTL);
  console.log(`[Cache SET] ${cacheKey} (TTL: ${GLOBAL_CACHE_TTL}s)`);
  return { info: ai, cached: false, source: "ai" };
}

async function getPersonalInfo(
  userId: number,
  exerciseName: string,
  global: GlobalInfo,
  bodyAnalysis: {
    focus_areas?: string[];
    posture_notes?: string[];
    body_type?: string;
    muscle_development?: string;
  }
): Promise<{ info: PersonalInfo | null; cached: boolean }> {
  const normalized = normalizeExerciseName(exerciseName);

  // Personalized cache key depends on body analysis content — when user re-analyzes, key changes naturally.
  const bodySig = shortHash(
    JSON.stringify({
      fa: (bodyAnalysis.focus_areas ?? []).map((s) => s.toLowerCase()).sort(),
      pn: (bodyAnalysis.posture_notes ?? []).map((s) => s.toLowerCase()).sort(),
      bt: bodyAnalysis.body_type ?? "",
      md: bodyAnalysis.muscle_development ?? "",
    })
  );
  const cacheKey = `exinfo:personal:${CACHE_VERSION}:${userId}:${shortHash(normalized)}:${bodySig}`;

  const cached = await redisGetJson<PersonalInfo>(cacheKey);
  if (cached) {
    console.log(`[Cache HIT] ${cacheKey}`);
    return { info: cached, cached: true };
  }
  console.log(`[Cache MISS] ${cacheKey}`);

  const safeName = escapeForPrompt(sanitizeUntrustedText(exerciseName, { maxChars: 120 }));
  const safeFA = (bodyAnalysis.focus_areas ?? []).map((s) => escapeForPrompt(sanitizeUntrustedText(s, { maxChars: 80 })));
  const safePN = (bodyAnalysis.posture_notes ?? []).map((s) => escapeForPrompt(sanitizeUntrustedText(s, { maxChars: 80 })));
  const safeBT = escapeForPrompt(sanitizeUntrustedText(bodyAnalysis.body_type ?? "", { maxChars: 30 }));
  const safeMD = escapeForPrompt(sanitizeUntrustedText(bodyAnalysis.muscle_development ?? "", { maxChars: 30 }));

  const muscleList = [...global.primary, ...global.secondary].map((m) => muscleLabel(m)).join(", ");

  const systemPrompt = `You are a personal fitness coach. Given an exercise (with the muscles it targets) and a user's body composition analysis, write ONE short personalized note (2-3 sentences max, under 280 chars) explaining how this exercise will help THIS user specifically, based on their focus areas and posture notes.

Output JSON only (no commentary):
{
  "personal_note": string,   // 2-3 sentences, max 280 chars, no emojis, write in second person ("you")
  "matched_focus_areas": string[]  // copy back the user's exact focus_areas that this exercise helps with (subset of provided)
}

Rules:
- If the exercise does NOT meaningfully help any of the user's focus areas, still write an honest note (e.g. "doesn't directly target your focus areas, but builds general strength").
- Never invent muscles or claims outside the provided muscle list.
- Do not list every focus area — only the ones genuinely targeted.`;

  const userPrompt = `Exercise: ${safeName}
Muscles trained: ${muscleList || "general"}
Region: ${global.region}

User body analysis:
- Body type: ${safeBT || "unknown"}
- Muscle development: ${safeMD || "unknown"}
- Focus areas: ${safeFA.length ? safeFA.join("; ") : "(none provided)"}
- Posture notes: ${safePN.length ? safePN.join("; ") : "(none provided)"}`;

  const ai = await callOpenAIJson(systemPrompt, userPrompt, PersonalAISchema, `exerciseInfo.personal:${normalized.slice(0, 40)}`);
  if (!ai) return { info: null, cached: false };

  await redisSetJson(cacheKey, ai, PERSONAL_CACHE_TTL);
  console.log(`[Cache SET] ${cacheKey} (TTL: ${PERSONAL_CACHE_TTL}s)`);
  return { info: ai, cached: false };
}

// ===================== Handler =====================
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const csrfError = await requireCsrf(request, session.userId);
  if (csrfError) return csrfError;

  await initializeDatabase();

  // Light rate limit — this is a cheap per-card lookup but guard against runaway clicks
  const burst = await rateLimit({
    key: `rl:exinfo:minute:${session.userId}`,
    limit: 30,
    windowSeconds: 60,
  });
  if (!burst.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${burst.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(burst.retryAfterSeconds) } }
    );
  }

  const parsed = safeParseWithError(RequestSchema, await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const exerciseName = parsed.data.exerciseName;

  // Layer 1: global muscle + benefits (heavily cached, shared across users)
  const { info: global, cached: globalCached, source: globalSource } = await getGlobalInfo(exerciseName);

  // Layer 2: personalized note (only if user has body analysis)
  let personal: PersonalInfo | null = null;
  let personalCached = false;
  try {
    const profile = await getProfile(session.userId);
    const raw = profile?.body_composition_analysis as
      | { focus_areas?: string[]; posture_notes?: string[]; body_type?: string; muscle_development?: string }
      | null
      | undefined;

    if (raw && (raw.focus_areas?.length || raw.posture_notes?.length || raw.body_type)) {
      const { info, cached } = await getPersonalInfo(session.userId, exerciseName, global, raw);
      personal = info;
      personalCached = cached;
    }
  } catch (err) {
    console.error("[exercise-info] body analysis fetch failed:", err);
  }

  const response: ResponseShape = {
    exerciseName,
    primary: global.primary,
    secondary: global.secondary,
    region: global.region,
    benefits: global.benefits,
    personalNote: personal?.personal_note,
    matchedFocusAreas: personal?.matched_focus_areas,
    source: personal ? "mixed" : globalSource,
    cached: { global: globalCached, personal: personalCached },
  };

  return NextResponse.json(response);
}
