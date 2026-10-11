// Server action errors: classify a database/API error into a code the UI can explain, and keep a reference id so a generic
// "unexpected error" can still be found in the server logs. Plain ESM (no imports) so tests can load it.

/** @param {string|undefined|null} message raw error text from Supabase/PostgREST */
export function classifyDbError(message) {
  const m = String(message || '');
  if (m.includes('insufficient_credits')) return 'insufficient_credits';
  if (m.includes('org_suspended')) return 'org_suspended';
  if (m.includes('campaign_not_found')) return 'campaign_not_found';
  if (m.includes('invalid_credits')) return 'invalid_credits';
  if (m.includes('forbidden') || m.includes('42501') || /row-level security/i.test(m)) return 'forbidden';
  if (m.includes('JWT') || m.includes('not authenticated') || m.includes('Auth session missing')) return 'session';
  if (m.includes('contact_cooldown')) return 'contact_cooldown';
  if (m.includes('opted_out')) return 'opted_out';
  return 'unknown';
}

/** Short reference shown to the user and written to the server log together with the technical cause. */
export function newErrorRef() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** Writes one structured line (no personal data: ids and codes only) and returns the reference id. */
export function logActionError(action, cause, extra = {}) {
  const ref = newErrorRef();
  const text = cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : String(cause ?? '');
  console.error(JSON.stringify({ tag: 'wasla-action-error', ref, action, code: classifyDbError(text), cause: text.slice(0, 300), ...extra }));
  return ref;
}

/**
 * First invalid field of a zod result as { field, issue }, for a message that names the field.
 * @param {{ issues: { path: (string|number)[], message: string }[] }} error
 */
export function firstInvalidField(error) {
  const i = error && error.issues && error.issues[0];
  return i ? { field: String(i.path && i.path[0] !== undefined ? i.path[0] : ''), issue: i.message } : { field: '', issue: '' };
}
