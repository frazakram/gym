/**
 * Anthropic model selection, shared by the routine, diet and notes generators
 * and the model picker. Client-safe (no server imports).
 */

/** Used when the user has not chosen a model. Active per Anthropic's model deprecations page (checked 2026-11-16). */
export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-6';
export const DEFAULT_ANTHROPIC_MODEL_LABEL = 'Claude Sonnet 4.6';

/**
 * Models Anthropic has retired: every request naming one fails. Users may still
 * have one saved in their AI settings (the picker offered Claude 3.5 Sonnet),
 * so it is replaced by the default instead of being sent.
 */
const RETIRED_ANTHROPIC_MODELS = new Set(['claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-20240620']);

/** The model to call for a user's choice (empty, unknown-but-current, or retired). */
export function resolveAnthropicModel(requested?: string | null): string {
  const model = requested?.trim();
  if (!model || RETIRED_ANTHROPIC_MODELS.has(model)) return DEFAULT_ANTHROPIC_MODEL;
  return model;
}
