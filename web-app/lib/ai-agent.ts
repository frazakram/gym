import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { RoutineGenerationInput, WeeklyRoutine } from "@/types";

const ExerciseSchema = z.object({
  name: z.string().describe("Name of the exercise"),
  sets_reps: z.string().describe("Sets and reps, e.g., '3 sets x 12 reps'"),
  youtube_url: z.string().describe("YouTube tutorial URL for the exercise"),
  form_tip: z.string().describe("Form and technique tips for proper execution"),
});

const DayRoutineSchema = z.object({
  day: z.string().describe("Day of the week, e.g., 'Monday - Chest & Triceps'"),
  exercises: z.array(ExerciseSchema).describe("List of exercises for this day"),
});

const WeeklyRoutineSchema = z.object({
  days: z.array(DayRoutineSchema).describe("Complete weekly routine with all days"),
});

export async function generateRoutine(input: RoutineGenerationInput): Promise<WeeklyRoutine | null> {

  let model;

  if (input.model_provider === 'Anthropic') {
    const apiKey = input.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }
    model = new ChatAnthropic({
      model: "claude-3-5-sonnet-20241022",
      temperature: 0.7,
      apiKey: apiKey,
    });
  } else {
    const apiKey = input.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    const openaiModel = process.env.OPENAI_MODEL || "gpt-4o";
    model = new ChatOpenAI({
      model: openaiModel,
      temperature: 0.7,
      apiKey: apiKey,
    });
  }

  const structuredModel = model.withStructuredOutput(WeeklyRoutineSchema);

  const prompt = `You are an expert personal trainer and strength coach. Create a realistic, safe, and highly personalized 7-day gym routine that a good trainer would recommend after assessing the client.

Client Profile (use ALL of these when deciding exercise selection, volume, intensity, rest, and progression):
- Age: ${input.age} years
- Current weight: ${input.weight} kg
- Height: ${input.height} cm
- Gender: ${input.gender}
- Primary goal: ${input.goal}
${typeof input.goal_weight === 'number' ? `- Goal weight: ${input.goal_weight} kg` : ''}
- Experience level: ${input.level}
- Training history/duration: ${input.tenure}
${input.notes && input.notes.trim() ? `- Additional comments/constraints: ${input.notes.trim()}` : ''}

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
- Return exactly the structured JSON that matches the schema (days → exercises).
- For each exercise include:
  - name
  - sets_reps (include sets, reps, and optionally rest time)
  - youtube_url (REAL YouTube URLs from reputable channels like Athlean-X, Jeff Nippard, Jeremy Ethier, ScottHermanFitness)
  - form_tip (short, practical cues to avoid injury)

Structure the routine with:
- Proper muscle group splits
- Rest days appropriate for their level
- Progressive overload principles
- Exercises suitable for their experience

Make sure to provide REAL YouTube URLs for exercises from channels like:
- Athlean-X
- Jeff Nippard
- Jeremy Ethier
- ScottHermanFitness

Return the complete weekly routine.`;

  // Some OpenAI accounts/projects may not have access to certain models; retry once with a safer default.
  try {
    const response = await structuredModel.invoke([
      { role: "user", content: prompt }
    ]);
    return response as WeeklyRoutine;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isOpenAIProvider = input.model_provider !== 'Anthropic';
    const configuredModel = process.env.OPENAI_MODEL || "gpt-4o";
    const shouldRetryWithMini =
      isOpenAIProvider &&
      configuredModel === "gpt-4o" &&
      (msg.toLowerCase().includes("model") && (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("does not exist")));

    if (!shouldRetryWithMini) throw err;

    const fallback = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0.7,
      apiKey: input.apiKey || process.env.OPENAI_API_KEY,
    }).withStructuredOutput(WeeklyRoutineSchema);

    const response = await fallback.invoke([{ role: "user", content: prompt }]);
    return response as WeeklyRoutine;
  }

  // Removed try/catch to allow error propagation to the API route
}

