import type { Dict } from '@/lib/i18n';
import type { CampaignLead } from '@/lib/types';

/** Reasons are stored as keys so they render in the user's language; the free-text label (review complaint) stays as written. */
export function reasonTexts(cl: Pick<CampaignLead, 'score_reason_keys' | 'score_reasons'>, t: Dict): string[] {
  const keys = cl.score_reason_keys ?? [];
  if (!keys.length) return cl.score_reasons ?? [];
  return keys.map((r) => r.label ?? t.signals[r.k]?.[r.s] ?? r.k);
}
