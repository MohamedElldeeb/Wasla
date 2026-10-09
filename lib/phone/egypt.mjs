// Egyptian phone normalization. Plain ESM JS (JSDoc types) so the same source is inlined into n8n Code nodes.
// Stored form is E.164 with "+" (e.g. +201012345678). wa.me links use the digits without "+".
// WhatsApp-eligible = Egyptian MOBILE only (prefixes 010, 011, 012, 015). Landlines get a call action.

/**
 * @param {...(string|null|undefined)} candidates raw phone strings, best first (e.g. unformatted, then display)
 * @returns {{phone_raw: string|null, phone_e164: string|null, phone_type: 'mobile'|'landline'|'unknown', whatsapp_eligible: boolean}}
 */
export function normalizeEgyptPhone(...candidates) {
  const phone_raw = candidates.find((c) => c && String(c).trim()) ?? null;
  for (const c of candidates) {
    if (!c) continue;
    let d = String(c).replace(/[٠-٩]/g, (x) => String(x.charCodeAt(0) - 0x0660)).replace(/\D/g, '');
    if (!d) continue;
    if (d.startsWith('0020')) d = d.slice(2); // 0020... -> 20...
    if (d.startsWith('20') && d.length >= 11 && d.length <= 12) d = d.slice(2); // national significant number
    else if (d.startsWith('0')) d = d.slice(1);
    // d is now the national number without the trunk 0
    if (/^1[0125]\d{8}$/.test(d)) {
      return { phone_raw, phone_e164: `+20${d}`, phone_type: 'mobile', whatsapp_eligible: true };
    }
    if (/^1\d{8,9}$/.test(d)) {
      // other mobile-looking numbers (e.g. 016, 017, 019 are not WhatsApp-eligible here)
      return { phone_raw, phone_e164: `+20${d}`, phone_type: 'unknown', whatsapp_eligible: false };
    }
    if (/^[2-9]\d{7,8}$/.test(d)) {
      return { phone_raw, phone_e164: `+20${d}`, phone_type: 'landline', whatsapp_eligible: false };
    }
  }
  return { phone_raw, phone_e164: null, phone_type: 'unknown', whatsapp_eligible: false };
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
