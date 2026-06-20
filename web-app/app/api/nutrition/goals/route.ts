import { withCors } from "@/lib/corsMiddleware";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { initializeDatabase, getNutritionGoals, saveNutritionGoals, saveActivityLevel } from "@/lib/db";
import { calculateTdee, goalTargets } from "@/lib/nutrition/tdee";
import { NutritionGoalsSchema, GoalCalcSchema, safeParseWithError } from "@/lib/validations";
import type { NutritionGoals } from "@/types";

export const runtime = "nodejs";

/** GET — current daily targets. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

    await initializeDatabase();
    const goals = await getNutritionGoals(session.userId);
    return withCors(NextResponse.json({ goals }));
  } catch (error) {
    console.error("get goals failed:", error);
    return withCors(NextResponse.json({ error: "Failed to load goals" }, { status: 500 }));
  }
}

/** PUT — manual override of any target(s). Merges over existing values. */
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

    const csrfError = await requireCsrf(request, session.userId);
    if (csrfError) return csrfError;

    await initializeDatabase();

    const parsed = safeParseWithError(NutritionGoalsSchema, await request.json().catch(() => ({})));
    if (!parsed.success) return withCors(NextResponse.json({ error: parsed.error }, { status: 400 }));

    const existing = await getNutritionGoals(session.userId);
    const merged: NutritionGoals = {
      daily_calorie_goal:
        parsed.data.daily_calorie_goal !== undefined ? parsed.data.daily_calorie_goal : existing.daily_calorie_goal,
      protein_goal_g:
        parsed.data.protein_goal_g !== undefined ? parsed.data.protein_goal_g : existing.protein_goal_g,
      carb_goal_g: parsed.data.carb_goal_g !== undefined ? parsed.data.carb_goal_g : existing.carb_goal_g,
      fat_goal_g: parsed.data.fat_goal_g !== undefined ? parsed.data.fat_goal_g : existing.fat_goal_g,
      goal_type: parsed.data.goal_type !== undefined ? parsed.data.goal_type : existing.goal_type,
    };

    const goals = await saveNutritionGoals(session.userId, merged);
    if (!goals) return withCors(NextResponse.json({ error: "Save a profile first" }, { status: 409 }));

    return withCors(NextResponse.json({ goals }));
  } catch (error) {
    console.error("update goals failed:", error);
    return withCors(NextResponse.json({ error: "Failed to update goals" }, { status: 500 }));
  }
}

/**
 * POST — compute TDEE-based targets (Mifflin-St Jeor). Returns the suggestion
 * and, when `save:true`, persists it to the profile.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

    const csrfError = await requireCsrf(request, session.userId);
    if (csrfError) return csrfError;

    await initializeDatabase();

    const parsed = safeParseWithError(GoalCalcSchema, await request.json().catch(() => ({})));
    if (!parsed.success) return withCors(NextResponse.json({ error: parsed.error }, { status: 400 }));

    const { age, weight_kg, height_cm, sex, activity_level, goal_type, save } = parsed.data;

    const { bmr, tdee } = calculateTdee({ age, weight_kg, height_cm, sex, activity_level });
    const targets = goalTargets(tdee, goal_type, weight_kg);

    const suggested: NutritionGoals = {
      daily_calorie_goal: targets.calories,
      protein_goal_g: targets.protein_g,
      carb_goal_g: targets.carb_g,
      fat_goal_g: targets.fat_g,
      goal_type,
    };

    let saved: NutritionGoals | null = null;
    if (save) {
      saved = await saveNutritionGoals(session.userId, suggested);
      if (!saved) return withCors(NextResponse.json({ error: "Save a profile first" }, { status: 409 }));
      // Remember activity level so the wizard doesn't ask again next time.
      await saveActivityLevel(session.userId, activity_level);
    }

    return withCors(NextResponse.json({ bmr, tdee, goals: saved ?? suggested, saved: Boolean(saved) }));
  } catch (error) {
    console.error("calculate goals failed:", error);
    return withCors(NextResponse.json({ error: "Failed to calculate goals" }, { status: 500 }));
  }
}
