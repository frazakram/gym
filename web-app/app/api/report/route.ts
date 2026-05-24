import { withCors } from "@/lib/corsMiddleware";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getSession } from "@/lib/auth";
import {
  initializeDatabase,
  getLatestRoutine,
  getRoutineById,
  getRoutinesByUser,
  getCompletionStats,
  getDayCompletions,
  getProfile,
  getStreak,
} from "@/lib/db";
import { redisGetJson, redisSetJson } from "@/lib/redis";
import {
  generateWeeklyReportData,
  computeDeltas,
  computePushPullSplit,
  detectImbalance,
  quickCompletionPercent,
  type WeeklyReportData,
  type WeeklyDeltas,
  type PushPullSplit,
  type ImbalanceFlag,
} from "@/lib/report-utils";
import type { WeeklyRoutine } from "@/types";

export const runtime = "nodejs";

const COACH_NOTE_CACHE_TTL = 60 * 60 * 24 * 30; // 30 days — invalidates by completion hash
const TREND_WEEKS = 8;

interface TrendPoint {
  weekNumber: number;
  weekStartDate: string | null;
  completionPercentage: number;
}

interface CoachNote {
  text: string;
  generatedAt: string;
}

function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

function parseRoutineJson(raw: unknown): WeeklyRoutine {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as WeeklyRoutine;
    } catch {
      return { days: [] };
    }
  }
  return (raw as WeeklyRoutine) ?? { days: [] };
}

async function buildCompletionMaps(userId: number, routineId: number) {
  const [exerciseRows, dayRows] = await Promise.all([
    getCompletionStats(userId, routineId),
    getDayCompletions(userId, routineId),
  ]);
  const exerciseMap: Record<string, boolean> = {};
  for (const row of exerciseRows) {
    exerciseMap[`${row.day_index}-${row.exercise_index}`] = Boolean(row.completed);
  }
  const dayMap: Record<string, boolean> = {};
  for (const row of dayRows) {
    dayMap[String(row.day_index)] = Boolean(row.completed);
  }
  return { exerciseMap, dayMap };
}

// Build AI coach-note prompt + call OpenAI with Redis cache.
async function buildCoachNote(opts: {
  userId: number;
  routineId: number;
  goal: string | undefined;
  level: string | undefined;
  report: WeeklyReportData;
  previousReport: WeeklyReportData | null;
  deltas: WeeklyDeltas;
  split: PushPullSplit;
  imbalance: ImbalanceFlag | null;
  currentStreak: number;
}): Promise<CoachNote | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  // Cache key = routineId + hash of the inputs that would change the note.
  // If user toggles completions, hash changes → new note generated.
  const hashInput = JSON.stringify({
    completion: opts.report.completionPercentage,
    completedEx: opts.report.completedExercises,
    completedDays: opts.report.completedDaysCount,
    primary: opts.report.primaryFocusRegion,
    split: opts.split,
    imbalance: opts.imbalance?.type ?? null,
    delta: opts.deltas.completionDelta,
    streak: opts.currentStreak,
    goal: opts.goal ?? "",
    level: opts.level ?? "",
  });
  const cacheKey = `coach-note:v1:${opts.userId}:${opts.routineId}:${shortHash(hashInput)}`;

  const cached = await redisGetJson<CoachNote>(cacheKey);
  if (cached) {
    console.log(`[Cache HIT] ${cacheKey}`);
    return cached;
  }
  console.log(`[Cache MISS] ${cacheKey}`);

  const systemPrompt = `You are a friendly, expert personal trainer writing the closing note of a user's weekly progress report.

Your job: write ONE short paragraph (3-5 sentences, max 480 chars). Be warm but specific.

Structure:
1. Open with a quick acknowledgment of the week (the completion %, the trend vs last week if non-zero).
2. Call out the standout — the muscle/region they hit hardest, or any clear imbalance worth fixing.
3. End with ONE concrete, specific action for next week (an exercise to add, a balance to fix, a streak goal).

Rules:
- No emojis. No hashtags. No bullet points. Just prose.
- Talk to the user in second person ("you", "your").
- If they completed 0%, be encouraging but honest — no fake praise.
- If the imbalance flag is set, the action MUST address it.
- Be specific to the numbers you're given — don't be generic.`;

  const userPrompt = `User profile:
- Goal: ${opts.goal || "General fitness"}
- Level: ${opts.level || "Beginner"}
- Current streak: ${opts.currentStreak} day${opts.currentStreak === 1 ? "" : "s"}

This week's stats:
- Completion: ${opts.report.completionPercentage}% (${opts.report.completedExercises}/${opts.report.totalExercises} exercises, ${opts.report.completedDaysCount}/${opts.report.totalDaysCount} days)
- Primary focus region: ${opts.report.primaryFocusRegion}
- Push/Pull/Legs/Core split: push ${opts.split.push}% · pull ${opts.split.pull}% · legs ${opts.split.legs}% · core ${opts.split.core}%
- Top trained muscles (by %): ${Object.entries(opts.report.muscleActivation)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([m, v]) => `${m} ${v}%`)
    .join(", ") || "none"}

Vs last week:
- Completion delta: ${opts.deltas.completionDelta >= 0 ? "+" : ""}${opts.deltas.completionDelta} pts
- Exercises delta: ${opts.deltas.completedExercisesDelta >= 0 ? "+" : ""}${opts.deltas.completedExercisesDelta}

${opts.imbalance ? `Detected imbalance: ${opts.imbalance.type} (${opts.imbalance.severity}). ${opts.imbalance.message}` : "No major imbalance detected."}

Write the note.`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL_COACH_NOTE || "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 220,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn("[coach-note] OpenAI HTTP", res.status);
      return null;
    }
    const json: any = await res.json();
    const text: string = json?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text || text.length < 20) return null;
    const note: CoachNote = { text, generatedAt: new Date().toISOString() };
    await redisSetJson(cacheKey, note, COACH_NOTE_CACHE_TTL);
    return note;
  } catch (err) {
    console.warn("[coach-note] failed:", err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    await initializeDatabase();

    const { searchParams } = new URL(req.url);
    const routineIdParam = searchParams.get("routineId");

    // ---- Current routine ----
    let routine: any;
    if (routineIdParam) {
      const id = Number(routineIdParam);
      if (!Number.isFinite(id) || id <= 0) {
        return withCors(NextResponse.json({ error: "Invalid routineId" }, { status: 400 }));
      }
      routine = await getRoutineById(session.userId, id);
    } else {
      routine = await getLatestRoutine(session.userId);
    }

    if (!routine) {
      return withCors(NextResponse.json({ error: "No routine found" }, { status: 404 }));
    }

    // ---- Parallel fetch: current completions, profile, all routines (for history), streak ----
    const [currentCompletions, profile, allRoutines, streak] = await Promise.all([
      buildCompletionMaps(session.userId, routine.id),
      getProfile(session.userId),
      getRoutinesByUser(session.userId, { includeArchived: true }),
      getStreak(session.userId),
    ]);

    const routineJson = parseRoutineJson(routine.routine_json);
    const bodyWeight = typeof profile?.weight === "number" ? profile.weight : undefined;

    // ---- Current week report ----
    const report = generateWeeklyReportData(
      routineJson,
      currentCompletions.exerciseMap,
      currentCompletions.dayMap,
      bodyWeight
    );

    // ---- Previous week report (for deltas) ----
    // Find the most recent routine that is NOT the current one (any week_number, prefer one strictly before).
    const otherRoutines = allRoutines.filter((r: any) => r.id !== routine.id);
    const previousRoutine = otherRoutines[0] ?? null; // already sorted DESC by week_number/created_at

    let previousReport: WeeklyReportData | null = null;
    if (previousRoutine) {
      const prevCompletions = await buildCompletionMaps(session.userId, previousRoutine.id);
      previousReport = generateWeeklyReportData(
        parseRoutineJson(previousRoutine.routine_json),
        prevCompletions.exerciseMap,
        prevCompletions.dayMap,
        bodyWeight
      );
    }

    const deltas = computeDeltas(report, previousReport);
    const split = computePushPullSplit(report.muscleActivation);
    const imbalance = detectImbalance(report.muscleActivation, split);

    // ---- 8-week trend sparkline ----
    // Take the most recent TREND_WEEKS routines, build a completion% point per routine.
    const trendCandidates = allRoutines.slice(0, TREND_WEEKS);
    const trend: TrendPoint[] = [];
    await Promise.all(
      trendCandidates.map(async (r: any) => {
        const { exerciseMap, dayMap } = await buildCompletionMaps(session.userId, r.id);
        trend.push({
          weekNumber: Number(r.week_number),
          weekStartDate: r.week_start_date ?? null,
          completionPercentage: quickCompletionPercent(
            parseRoutineJson(r.routine_json),
            exerciseMap,
            dayMap
          ),
        });
      })
    );
    // Sort ascending by week_number for the chart
    trend.sort((a, b) => a.weekNumber - b.weekNumber);

    // ---- AI coach note (cached) ----
    const coachNote = await buildCoachNote({
      userId: session.userId,
      routineId: routine.id,
      goal: profile?.goal as string | undefined,
      level: profile?.level as string | undefined,
      report,
      previousReport,
      deltas,
      split,
      imbalance,
      currentStreak: streak?.current ?? 0,
    });

    return withCors(
      NextResponse.json({
        routine: {
          id: routine.id,
          week_number: routine.week_number,
          week_start_date: routine.week_start_date,
          created_at: routine.created_at,
          routine_json: routineJson,
        },
        exerciseCompletions: currentCompletions.exerciseMap,
        dayCompletions: currentCompletions.dayMap,
        profile: profile
          ? {
              name: profile.name,
              age: profile.age,
              weight: profile.weight,
              height: profile.height,
              gender: profile.gender,
              goal: profile.goal,
              level: profile.level,
              goal_weight: profile.goal_weight,
              goal_duration: profile.goal_duration,
              body_photos: profile.body_photos,
              body_composition_analysis: profile.body_composition_analysis,
            }
          : null,
        deltas,
        split,
        imbalance,
        trend,
        streak: {
          current: streak?.current ?? 0,
          longest: streak?.longest ?? 0,
          last_workout_date: streak?.last_workout_date ?? null,
        },
        coachNote,
      })
    );
  } catch (error) {
    console.error("Error fetching report data:", error);
    return withCors(NextResponse.json({ error: "Internal server error" }, { status: 500 }));
  }
}
