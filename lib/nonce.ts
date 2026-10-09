/** Client-side idempotency nonce for double-click protection on job-starting actions. */
export const newNonce = () => crypto.randomUUID();
