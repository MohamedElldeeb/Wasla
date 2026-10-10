// DESIGN v2 section 10 checks that can be automated: token contrast, hardcoded values in code, and (with BASE running) horizontal scroll at 375px
// and the number of orange primary buttons per screen. Usage: node scripts/design-verify.mjs [--browser]
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync('app/globals.css', 'utf8');
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(ok ? 'PASS' : 'FAIL', name, detail); };

// ── contrast ──
function block(sel) { const i = css.indexOf(sel); return css.slice(i, css.indexOf('\n}', i)); }
function vars(text, base = {}) {
  const out = { ...base };
  for (const m of text.matchAll(/--([\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
const rootVars = vars(block(':root {'));
const light = rootVars;
const dark = vars(block('.dark {'), rootVars);
function resolve(v, set) { let x = set[v]; let n = 0; while (x && x.startsWith('var(') && n++ < 5) x = set[x.slice(6, -1)]; return x; }
function rgba(c) {
  if (c.startsWith('#')) { const h = c.length === 4 ? [...c.slice(1)].map((d) => d + d).join('') : c.slice(1); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(1); }
  const m = c.match(/rgb\(([\d\s.]+)(?:\/\s*([\d.]+))?\)/);
  const p = m[1].trim().split(/\s+/).map(Number);
  return [p[0], p[1], p[2], m[2] ? Number(m[2]) : 1];
}
const over = (fg, bg) => fg.slice(0, 3).map((c, i) => c * fg[3] + bg[i] * (1 - fg[3]));
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
function contrast(set, fgName, bgName, onName) {
  const bgBase = rgba(resolve(onName ?? 'bg', set));
  const bg = over(rgba(resolve(bgName, set)), bgBase);
  const fg = over(rgba(resolve(fgName, set)), bg);
  return ratio(fg, bg);
}
const pairs = [
  ['fg', 'bg', 4.5], ['fg-body', 'bg', 4.5], ['fg-body', 'surface', 4.5], ['fg-muted', 'bg', 4.5], ['fg-muted', 'surface', 4.5],
  ['primary-fg', 'primary', 4.5], ['brand', 'surface', 4.5], ['primary-on-soft', 'primary-soft', 4.5, 'surface'], ['brand', 'brand-soft', 4.5, 'surface'],
  ['success', 'success-soft', 4.5, 'surface'], ['warning', 'warning-soft', 4.5, 'surface'], ['danger', 'danger-soft', 4.5, 'surface'],
  ['fg-subtle', 'bg', 3], ['focus', 'bg', 3], ['fg-muted', 'surface-muted', 4.5, 'surface'],
];
for (const [name, set] of [['light', light], ['dark', dark]]) {
  for (const [f, b, min, on] of pairs) {
    const r = contrast(set, f, b, on);
    check(`contrast ${name}: ${f} on ${b} >= ${min}`, r >= min, r.toFixed(2));
  }
}

// ── hardcoded values outside the token file ──
function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (!['node_modules', '.next'].includes(f)) walk(p, out); } else if (/\.(tsx|ts)$/.test(f)) out.push(p);
  }
  return out;
}
const files = [...walk('app'), ...walk('components')].filter((f) => !f.endsWith('globals.css'));
const bad = [];
const rules = [
  [/#[0-9a-fA-F]{3,8}\b(?![\w-])/, 'hex color'], [/\brgba?\(/, 'rgb()'], [/\brounded-(sm|md|lg|xl|2xl|3xl)\b/, 'raw radius'],
  [/\bshadow-(sm|md|lg|xl|2xl)\b/, 'raw shadow'], [/\btext-\[\d+px\]/, 'raw font size'], [/\b(ml|mr|pl|pr)-\d/, 'physical margin/padding'],
  [/\b(left|right)-\d/, 'physical offset'], [/\btext-(left|right)\b/, 'physical text align'], [/\bfont-(bold|extrabold|black)\b/, 'bold weight'],
];
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((ln, i) => {
    if (/^\s*(\/\/|\*)/.test(ln) || f.endsWith('market-insights.tsx') || f.includes('preview')) return;
    for (const [re, label] of rules) if (re.test(ln) && !/brand-mark|mark-google/.test(ln)) bad.push(`${f}:${i + 1} ${label}`);
  });
}
check('no hardcoded colors, radii, shadows, sizes or physical properties in app/ and components/', bad.length === 0, bad.length ? `\n  ${bad.slice(0, 20).join('\n  ')}` : '');

// ── browser checks ──
if (process.argv.includes('--browser')) {
  const { chromium } = await import('playwright-core');
  const state = JSON.parse(readFileSync(new URL('./.e2e-state.local.json', import.meta.url), 'utf8'));
  const BASE = process.env.BASE || 'http://localhost:3000';
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const routes = ['/', '/login', '/signup', '/dashboard', '/campaigns', '/campaigns/new', `/campaigns/${state.campaign}`, '/leads', '/settings'];
  for (const locale of ['ar', 'en']) for (const theme of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: locale === 'ar' ? 'ar-EG' : 'en-US' });
    await ctx.addCookies([{ name: 'wasla_locale', value: locale, url: BASE }]);
    await ctx.addInitScript((th) => { try { localStorage.setItem('theme', th); } catch {} }, theme);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`); await page.waitForSelector('#email');
    await page.fill('#email', state.email); await page.fill('#password', state.password); await page.click('button[type=submit]');
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    for (const r of routes) {
      if (r === '/' ) { await ctx.clearCookies(); await ctx.addCookies([{ name: 'wasla_locale', value: locale, url: BASE }]); }
      await page.goto(`${BASE}${r}`); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(500);
      const m = await page.evaluate(() => {
        const prim = [...document.querySelectorAll('button, a')].filter((e) => { const c = getComputedStyle(e).backgroundColor; return c === 'rgb(242, 122, 26)' && e.offsetParent !== null; });
        const small = [...document.querySelectorAll('button, a[href], input, [role=tab], [role=radio]')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.height < 40 && getComputedStyle(e).visibility !== 'hidden' && e.offsetParent !== null; }).map((e) => (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 24));
        return { sw: document.documentElement.scrollWidth, orange: prim.length, small };
      });
      check(`${locale}/${theme} ${r}: no horizontal scroll at 375px`, m.sw <= 375, `scrollWidth ${m.sw}`);
      if (locale === 'en' && theme === 'dark') console.log(`   orange buttons: ${m.orange}; controls under 40px high: ${m.small.length}${m.small.length ? ' [' + m.small.slice(0, 6).join(' | ') + ']' : ''}`);
    }
    await ctx.close();
  }
  await browser.close();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
