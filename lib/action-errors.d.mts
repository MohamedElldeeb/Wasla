export type DbErrorCode = 'insufficient_credits' | 'org_suspended' | 'campaign_not_found' | 'invalid_credits' | 'forbidden' | 'session' | 'contact_cooldown' | 'opted_out' | 'unknown';
export function classifyDbError(message: string | undefined | null): DbErrorCode;
export function newErrorRef(): string;
export function logActionError(action: string, cause: unknown, extra?: Record<string, unknown>): string;
export function firstInvalidField(error: { issues: { path: PropertyKey[]; message: string }[] }): { field: string; issue: string };
