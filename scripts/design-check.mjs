// DESIGN.md section 9 automated checks: horizontal scroll, touch targets (48px on mobile), color contrast (axe), focus ring.
// Usage: node scripts/design-check.mjs [--widths 375] [--langs ar,en] [--schemes light,dark]
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1].split(',') : d; };
const widths = opt('widths', ['375']).map(Number);
const langs = opt('langs', ['ar', 'en']);
const schemes = opt('schemes', ['light', 'dark']);
const BASE = process.env.BASE || 'http://localhost:3000';
const state = JSON.parse(readFileSync(new URL('./.e2e-state.local.json', import.meta.url), 'utf8'));

const pages = {
  landing: ['none', '/'], login: ['none', '/login'], signup: ['none', '/signup'],
  dashboard: ['e2e', '/dashboard'], campaigns: ['e2e', '/campaigns'], wizard1: ['e2e', '/campaigns/new'], leads: ['e2e', '/leads'], settings: ['e2e', '/settings'],
  campaign: ['e2e', `/campaigns/${state.campaign}`],
};
const tabs = { campaign_review: 1, campaign_send: 2 };

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
let problems = 0;
const report = (...a) => { problems++; console.log('  ✗', ...a); };

for (const lang of langs) for (const scheme of schemes) for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 812 }, colorScheme: scheme, locale: lang === 'ar' ? 'ar-EG' : 'en-US', hasTouch: w < 768 });
  await ctx.addCookies([{ name: 'wasla_locale', value: lang, url: BASE }]);
  const anonCtx = await browser.newContext({ viewport: { width: w, height: 812 }, colorScheme: scheme, locale: lang === 'ar' ? 'ar-EG' : 'en-US', hasTouch: w < 768 });
  await anonCtx.addCookies([{ name: 'wasla_locale', value: lang, url: BASE }]);
  const anon = await anonCtx.newPage();
  const user = await ctx.newPage();
  await user.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await user.waitForSelector('#email');
  await user.fill('#email', state.email); await user.fill('#password', state.password); await user.click('button[type=submit]');
  await user.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
  const targets = [...Object.entries(pages).map(([n, [a, p]]) => ({ n, a, p })), ...Object.entries(tabs).map(([n, tab]) => ({ n, a: 'e2e', p: pages.campaign[1], tab }))];
  console.log(`\n== ${lang} ${scheme} ${w}px`);
  for (const t of targets) {
    const page = t.a === 'none' ? anon : user;
    await page.goto(`${BASE}${t.p}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    if (t.tab != null) await page.getByRole('tab').nth(t.tab).click();
    await page.waitForTimeout(500);
    const issues = [];

    // 1. horizontal scroll
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 0) issues.push(`horizontal scroll (+${overflow}px)`);

    // 2. touch targets on mobile: visible interactive elements must be >= 48x48 (inline text links excluded)
    if (w < 768) {
      const small = await page.evaluate(() => {
        const out = [];
        const els = document.querySelectorAll('button, a[href], input:not([type=hidden]), textarea, select, [role=tab], [role=radio], [role=checkbox]');
        for (const el of els) {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          if (r.width <= 2 || r.height <= 2 || cs.visibility === 'hidden' || cs.display === 'none') continue; // sr-only skip links are exempt
          if (el.closest('[data-nextjs-dev-tools-button], nextjs-portal, [data-next-badge-root]') || el.id === 'next-logo') continue;
          if (el.tagName === 'A' && el.closest('p, li, span') && !el.className.includes('inline-flex') && cs.display === 'inline') continue;
          const inLabel = el.closest('label');
          const box = inLabel ? inLabel.getBoundingClientRect() : r;
          // hit area may extend through ::after (checkbox) or the wrapping label
          if (el.getAttribute('role') === 'checkbox' && box.height >= 48) continue;
          if (r.height < 47.5 || r.width < 47.5) out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
        return out;
      });
      if (small.length) issues.push(`small targets: ${[...new Set(small)].slice(0, 6).join(' | ')}${small.length > 6 ? ` (+${small.length - 6})` : ''}`);
    }

    // 3. contrast (axe)
    await page.addScriptTag({ content: axeSource });
    const violations = await page.evaluate(async () => {
      const res = await window.axe.run(document, { runOnly: ['color-contrast'], resultTypes: ['violations'] });
      return res.violations.flatMap((v) => v.nodes.map((n) => `${n.target.join(' ')} ${n.any[0]?.message?.replace(/\s+/g, ' ').slice(0, 90)}`));
    });
    if (violations.length) issues.push(`contrast: ${violations.slice(0, 4).join(' | ')}${violations.length > 4 ? ` (+${violations.length - 4})` : ''}`);

    // 4. visible focus ring on the first focusable element
    await page.keyboard.press('Tab');
    const ring = await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return 'none'; const s = getComputedStyle(e); return `${s.outlineStyle} ${s.outlineWidth}`; });
    if (!/solid 2px/.test(ring) && !(await page.evaluate(() => !!document.activeElement?.closest('[data-nextjs-dev-tools-button]')))) issues.push(`focus ring: ${ring}`);

    console.log(issues.length ? `✗ ${t.n}` : `✓ ${t.n}`);
    for (const i of issues) report(i);
  }
  await ctx.close();
  await anonCtx.close();
}
await browser.close();
console.log(`\n${problems} problem(s)`);
process.exit(problems ? 1 : 0);
