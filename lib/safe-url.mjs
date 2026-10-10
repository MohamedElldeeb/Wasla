/** Public http(s) URL only: no credentials, no localhost, no IP literals, no internal host names (the page is fetched by our n8n server). */
export function safePublicUrl(input) {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (u.username || u.password) return null;
    const h = u.hostname.toLowerCase();
    if (!h.includes('.') || h === 'localhost' || /^\d+(\.\d+){3}$/.test(h) || h.includes(':') || /\.(local|internal|lan|home|corp)$/.test(h)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

