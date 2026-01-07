import { getLatestRoutine, getCompletionStats } from '@/lib/db';

export interface HistoricalContext {
  weekNumber: number;
  totalExercises: number;
  completedExercises: number;
  completionPercentage: number;
  struggling: string[];
  excelling: string[];
}

export async function buildHistoricalContext(userId: number): Promise<HistoricalContext | null> {
  try {
    const latestRoutine = await getLatestRoutine(userId);
    if (!latestRoutine) return null;

    const completions = await getCompletionStats(latestRoutine.id);
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
  let prompt = `\n\n=== LAST WEEK'S PERFORMANCE (Week ${context.weekNumber}) ===\n`;
  prompt += `Overall completion: ${context.completedExercises}/${context.totalExercises} exercises (${context.completionPercentage}%)\n\n`;

  if (context.completionPercentage >= 80) {
    prompt += `The user completed most exercises successfully. Apply PROGRESSIVE OVERLOAD:\n`;
    prompt += `- Increase weight/reps/sets on compound movements by 5-10%\n`;
    prompt += `- Add more challenging variations where appropriate\n`;
    prompt += `- Consider adding more volume if they're ready\n\n`;
  } else if (context.completionPercentage < 50) {
    prompt += `The user struggled with completion. Recommend DE-LOADING:\n`;
    prompt += `- Reduce volume or intensity by 10-20%\n`;
    prompt += `- Focus on proper form and recovery\n`;
    prompt += `- Provide easier exercise variations\n\n`;
  } else {
    prompt += `Moderate completion. MAINTAIN current intensity with minor adjustments:\n`;
    prompt += `- Keep similar volume and intensity\n`;
    prompt += `- Swap out exercises they didn't complete with alternatives\n\n`;
  }

  if (context.struggling.length > 0) {
    prompt += `Exercises they struggled with: ${context.struggling.join(', ')}\n`;
    prompt += `Consider: easier variations, better form cues, or alternative exercises.\n\n`;
  }

  if (context.excelling.length > 0) {
    prompt += `Exercises they excelled at: ${context.excelling.join(', ')}\n`;
    prompt += `Consider: progressive overload on these specific movements.\n\n`;
  }

  return prompt;
}
