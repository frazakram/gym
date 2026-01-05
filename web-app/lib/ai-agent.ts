import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { RoutineGenerationInput, WeeklyRoutine } from "@/types";

const ExerciseSchema = z.object({
  name: z.string().describe("Name of the exercise"),
  sets_reps: z.string().describe("Sets and reps, e.g., '3 sets x 12 reps'"),
  youtube_url: z.string().url().describe("YouTube tutorial URL for the exercise"),
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
    model = new ChatOpenAI({
      model: "gpt-4o",
      temperature: 0.7,
      openAIApiKey: apiKey, // Explicit property name for OpenAI
    });
  }

  const structuredModel = model.withStructuredOutput(WeeklyRoutineSchema);

  const prompt = `You are an expert fitness trainer creating a personalized weekly gym routine.

User Profile:
- Age: ${input.age} years
- Weight: ${input.weight} kg
- Height: ${input.height} cm
- Experience Level: ${input.level}
- Training Duration: ${input.tenure}

Generate a comprehensive 7-day workout routine tailored to this user's profile. Include:
1. Appropriate exercises for their experience level
2. Proper sets and reps for muscle growth and strength
3. Valid YouTube URLs for exercise demonstrations (use real, popular fitness channels)
4. Detailed form tips for each exercise to prevent injury

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

  const response = await structuredModel.invoke([
    { role: "user", content: prompt }
  ]);

  return response as WeeklyRoutine;
// Removed try/catch to allow error propagation to the API route

