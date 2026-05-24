import { getLatestRoutine, getCompletionStats } from '@/lib/db';

export interface HistoricalContext {
  weekNumber: number;
  totalExercises: number;
  completedExercises: number;
  completionPercentage: number;
  struggling: string[];
  excelling: string[];
}

export async function buildHistoricalContext(userId: number, asOfDate?: string): Promise<HistoricalContext | null> {
  try {
    // asOfDate gates out future routines so we don't treat a pre-generated next-week
    // routine as "historical context" while the user is still in the current week.
    const latestRoutine = await getLatestRoutine(userId, asOfDate);
    if (!latestRoutine) return null;

    const completions = await getCompletionStats(userId, latestRoutine.id);
    const routineJson = latestRoutine.routine_json;

    // Calculate total exercises
    let totalExercises = 0;
    const exerciseCompletionMap = new Map<string, boolean>();

    routineJson.days?.forEach((day: any, dayIdx: number) => {
      day.exercises?.forEach((exercise: any, exIdx: number) => {
        totalExercises++;
        const key = `${dayIdx}-${exIdx}`;
        exerciseCompletionMap.set(key, false);
      });
    });

    // Mark completed exercises
    let completedCount = 0;
    completions.forEach((comp: any) => {
      const key = `${comp.day_index}-${comp.exercise_index}`;
      if (comp.completed) {
        exerciseCompletionMap.set(key, true);
        completedCount++;
      }
    });

    // Identify struggling and excelling exercises
    const struggling: string[] = [];
    const excelling: string[] = [];

    routineJson.days?.forEach((day: any, dayIdx: number) => {
      day.exercises?.forEach((exercise: any, exIdx: number) => {
        const key = `${dayIdx}-${exIdx}`;
        const isCompleted = exerciseCompletionMap.get(key);

        if (!isCompleted && totalExercises > 0) {
          struggling.push(exercise.name);
        } else if (isCompleted) {
          excelling.push(exercise.name);
        }
      });
    });

    const completionPercentage = totalExercises > 0
      ? Math.round((completedCount / totalExercises) * 100)
      : 0;

    return {
      weekNumber: latestRoutine.week_number,
      totalExercises,
      completedExercises: completedCount,
      completionPercentage,
      struggling: struggling.slice(0, 5), // Top 5 struggling exercises
      excelling: excelling.slice(0, 5), // Top 5 excelling exercises
    };
  } catch (error) {
    console.warn('Error building historical context:', error);
    return null;
  }
}

export function formatHistoricalContextForPrompt(context: HistoricalContext): string {
  let prompt = `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
  prompt += `📊 LAST WEEK'S PERFORMANCE (Week ${context.weekNumber})\n`
  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
  
  prompt += `Overall Completion: ${context.completedExercises}/${context.totalExercises} exercises (${context.completionPercentage}%)\n\n`

  // Progressive Overload Strategy based on completion rate
  if (context.completionPercentage >= 80) {
    prompt += `✅ EXCELLENT COMPLETION - APPLY PROGRESSIVE OVERLOAD:\n\n`
    prompt += `The user successfully completed most exercises. This indicates readiness for increased challenge.\n\n`
    prompt += `REQUIRED ACTIONS:\n`
    prompt += `• Increase weight prescriptions by 5-10% on compound movements (e.g., squat, deadlift, bench press)\n`
    prompt += `• Add 1-2 reps to isolation exercises where appropriate\n`
    prompt += `• Consider adding 1 additional set to key exercises if volume wasn't excessive\n`
    prompt += `• Introduce more challenging variations (e.g., barbell → one-arm dumbbell)\n`
    prompt += `• Maintain or slightly reduce rest periods to increase density\n\n`
  } else if (context.completionPercentage < 50) {
    prompt += `⚠️ LOW COMPLETION - RECOMMEND DELOAD WEEK:\n\n`
    prompt += `The user struggled significantly. This suggests overtraining, inadequate recovery, or excessive volume.\n\n`
    prompt += `REQUIRED ACTIONS:\n`
    prompt += `• Reduce total volume by 20-30% (fewer sets per exercise)\n`
    prompt += `• Decrease intensity by 10-20% (lighter weights, focus on form)\n`
    prompt += `• Replace complex movements with simpler, less fatiguing variations\n`
    prompt += `• Add more rest/recovery days or active recovery sessions\n`
    prompt += `• Focus on mobility work, technique refinement, and mental recovery\n`
    prompt += `• Consider whether external factors (sleep, nutrition, stress) may be impacting performance\n\n`
  } else {
    prompt += `📈 MODERATE COMPLETION (50-79%) - MAINTAIN WITH ADJUSTMENTS:\n\n`
    prompt += `Decent progress with room for improvement. Make strategic swaps rather than wholesale changes.\n\n`
    prompt += `REQUIRED ACTIONS:\n`
    prompt += `• Keep similar overall volume and intensity structure\n`
    prompt += `• Make small progressive increases (2.5-5%) on exercises they completed successfully\n`
    prompt += `• Replace exercises they didn't complete with easier or more suitable alternatives\n`
    prompt += `• Ensure adequate rest between sets and days\n`
    prompt += `• Continue building consistency before increasing difficulty significantly\n\n`
  }

  // Exercise-specific feedback
  if (context.struggling.length > 0) {
    prompt += `❌ STRUGGLED WITH: ${context.struggling.slice(0, 3).join(', ')}\n`
    prompt += `→ Provide easier variations, better form cues, or swap for alternative exercises targeting same muscle groups.\n\n`
  }

  if (context.excelling.length > 0) {
    prompt += `✅ EXCELLED AT: ${context.excelling.slice(0, 3).join(', ')}\n`
    prompt += `→ Apply progressive overload specifically to these movements (increase weight, reps, or add paused/tempo variations).\n\n`
  }

  prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
  prompt += `IMPORTANT: Base your routine adjustments heavily on this historical data. Progressive overload is KEY to results.\n\n`

  return prompt;
}

