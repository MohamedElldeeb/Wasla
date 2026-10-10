// PROPOSED values from specs.md. Kept in one place so they can move to a settings table later.
export const defaults = {
  /** Hard cap on leads per campaign run (Phase 2 limit, keeps an Apify run-sync under its 300s window). */
  maxResultsCap: 100,
  plannerCredits: 2,
  /** PROPOSED/OPEN: the cheap probe sample and the onboarding interview are free for the user (their LLM and Apify cost is logged on the job). */
  probeCredits: 0,
  interviewCredits: 0,
  regenerateCredits: 1,
  /** UI undo window after tapping a WhatsApp/Messenger action. The server grace is 15s. */
  undoSeconds: 10,
  /** Show the "near cap" warning from this share of the daily cap. */
  capWarnRatio: 0.8,
  defaultModel: 'openai/gpt-4o-mini',
} as const;

export function llmConfig(modelOverride?: string | null) {
  const model = (modelOverride && modelOverride.trim()) || process.env.OPENROUTER_MODEL || defaults.defaultModel;
  const fallback_models = (process.env.OPENROUTER_FALLBACK_MODELS || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== model);
  return { model, fallback_models };
}

/** Planner, interview, probe and fit check: few cheap calls, so the model may be stronger than the message model. */
export function plannerLlmConfig() {
  const base = llmConfig();
  const planner = (process.env.OPENROUTER_PLANNER_MODEL || '').trim();
  return { ...base, planner_model: planner || base.model };
}
