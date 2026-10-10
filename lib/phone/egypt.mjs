// Egyptian phone normalization. Plain ESM JS (JSDoc types) so the same source is inlined into n8n Code nodes.
// Stored form is E.164 with "+" (e.g. +201012345678). wa.me links use the digits without "+".
// WhatsApp-eligible = Egyptian MOBILE only (prefixes 010, 011, 012, 015). Landlines get a call action.

/**
 * @param {...(string|null|undefined)} candidates raw phone strings, best first (e.g. unformatted, then display)
 * @returns {{phone_raw: string|null, phone_e164: string|null, phone_type: 'mobile'|'landline'|'unknown', whatsapp_eligible: boolean, phone_invalid?: boolean}}
 */
export function normalizeEgyptPhone(...candidates) {
  const phone_raw = candidates.find((c) => c && String(c).trim()) ?? null;
  // National significant numbers: mobile = 1[0125] + 8 digits (10); landline = area code 2-9 + 7-8 digits (8-9).
  const MOBILE = /^1[0125]\d{8}$/;
  const OTHER_MOBILE = /^1\d{9}$/;
  const LANDLINE = /^[2-9]\d{7,8}$/;
  const valid = (n) => MOBILE.test(n) || OTHER_MOBILE.test(n) || LANDLINE.test(n);
  let invalid = false;
  for (const c of candidates) {
    if (!c) continue;
    let d = String(c).replace(/[٠-٩]/g, (x) => String(x.charCodeAt(0) - 0x0660)).replace(/\D/g, '');
    if (!d) continue;
    const international = /^\s*(\+|00)/.test(String(c));
    if (d.startsWith('0020')) d = d.slice(2); // 0020... -> 20...
    // Country code 20: strip it when what remains is a valid national number (so 8-digit Alexandria landlines survive).
    if (d.startsWith('20') && (international || d.length >= 11 || valid(d.slice(2))) && valid(d.slice(2))) d = d.slice(2);
    else if (d.startsWith('0')) d = d.slice(1);
    if (MOBILE.test(d)) return { phone_raw, phone_e164: `+20${d}`, phone_type: 'mobile', whatsapp_eligible: true };
    if (OTHER_MOBILE.test(d)) return { phone_raw, phone_e164: `+20${d}`, phone_type: 'unknown', whatsapp_eligible: false };
    if (LANDLINE.test(d)) return { phone_raw, phone_e164: `+20${d}`, phone_type: 'landline', whatsapp_eligible: false };
    invalid = true; // digits present but not a valid Egyptian length: never store a guessed number
  }
  return { phone_raw, phone_e164: null, phone_type: 'unknown', whatsapp_eligible: false, phone_invalid: invalid };
}

/** wa.me link: digits only (no "+", no spaces) and the message URL-encoded. */
export function whatsappLink(phoneE164, message) {
  const digits = String(phoneE164 || '').replace(/\D/g, '');
  if (!digits) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${text}`;
}

/** tel: link for landlines. */
export function telLink(phoneE164) {
  return phoneE164 ? `tel:${phoneE164}` : null;
}
