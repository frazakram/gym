import type { BodyCompositionAnalysis, GymEquipmentAnalysis } from "@/types";

// Prompt sections shared by both routine generators (lib/ai-agent.ts for
// Anthropic, lib/openai-routine.ts for OpenAI). Their wording is part of the
// prompt: tests/unit/routine-prompts.test.ts snapshots the full prompts.

/** Height in cm. Values <= 8 are treated as feet and converted (defensive). */
export function normalizeHeightCm(height: number): number {
  return typeof height === "number" && height > 0 && height <= 8
    ? Math.round(height * 30.48 * 10) / 10
    : height;
}

/** "AVAILABLE GYM EQUIPMENT" section, or '' without an analysis. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- analyses arrive as loosely typed JSON
export function buildEquipmentSection(equipmentAnalysis?: Partial<GymEquipmentAnalysis> | any): string {
  return equipmentAnalysis ? `

AVAILABLE GYM EQUIPMENT (CRITICAL - ONLY USE THESE):
${equipmentAnalysis.equipment_detected?.map((e: string) => `- ${e}`).join('\n') || 'Standard gym equipment'}

Gym Type: ${equipmentAnalysis.gym_type || 'commercial'}
Space: ${equipmentAnalysis.space_assessment || 'moderate'}
${equipmentAnalysis.unique_features?.length ? `\nSpecial Equipment: ${equipmentAnalysis.unique_features.join(', ')}` : ''}
${equipmentAnalysis.limitations?.length ? `\n⚠️ LIMITATIONS: ${equipmentAnalysis.limitations.join('; ')}` : ''}

EQUIPMENT USAGE RULES (CRITICAL):
- ONLY prescribe exercises that can be performed with the equipment listed above
- If barbell is not available, use dumbbell or bodyweight alternatives
- If squat rack is missing, suggest goblet squats, Bulgarian split squats, or lunges instead of back squats
- If no cable machines, use resistance band alternatives or free weight exercises
- Be creative with available equipment - suggest compound movements that work
- NO exercises requiring equipment not in the list above
` : '';
}

/** "BODY COMPOSITION ANALYSIS" section, or '' without an analysis. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- analyses arrive as loosely typed JSON
export function buildBodyCompositionSection(bodyAnalysis?: Partial<BodyCompositionAnalysis> | any): string {
  return bodyAnalysis ? `

BODY COMPOSITION ANALYSIS (use this to personalize exercise selection and intensity):
Body Type: ${bodyAnalysis.body_type || 'average'}
${bodyAnalysis.estimated_body_fat_range ? `Estimated Body Fat: ${bodyAnalysis.estimated_body_fat_range}` : ''}
Muscle Development: ${bodyAnalysis.muscle_development || 'beginner'}
${bodyAnalysis.posture_notes?.length ? `\nPosture Observations:\n${bodyAnalysis.posture_notes.map((n: string) => `- ${n}`).join('\n')}` : ''}
${bodyAnalysis.focus_areas?.length ? `\nFocus Areas:\n${bodyAnalysis.focus_areas.map((a: string) => `- ${a}`).join('\n')}` : ''}
${bodyAnalysis.realistic_timeline ? `\nRealistic Timeline: ${bodyAnalysis.realistic_timeline}` : ''}
${bodyAnalysis.exercise_modifications?.length ? `\nExercise Modifications:\n${bodyAnalysis.exercise_modifications.map((m: string) => `- ${m}`).join('\n')}` : ''}

BODY COMPOSITION USAGE RULES:
- Adjust exercise intensity based on muscle development level
- Address posture issues by including corrective exercises
- Prioritize focus areas mentioned in the analysis
- Consider exercise modifications for safer, more effective training
- Use realistic timeline to set appropriate progression pace
` : '';
}
