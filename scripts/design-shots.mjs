// Design audit screenshots (DESIGN.md section 0): every screen x 375/768/1280 x ar/en x light/dark.
// Usage: node scripts/design-shots.mjs <outDir> [--only screen1,screen2] [--widths 375,1280] [--langs ar] [--schemes light]
// Needs the app running at BASE (default http://localhost:3000) and the e2e + onboarding test users (see scripts/e2e-pipeline.mjs).
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const out = args[0];
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1].split(',') : def; };
const BASE = process.env.BASE || 'http://localhost:3000';
const widths = opt('widths', ['375', '768', '1280']).map(Number);
const langs = opt('langs', ['ar', 'en']);
const schemes = opt('schemes', ['light', 'dark']);
const only = opt('only', null);
const heights = { 375: 812, 768: 1024, 1280: 800 };
const state = JSON.parse(readFileSync(new URL('./.e2e-state.local.json', import.meta.url), 'utf8'));
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#email', { timeout: 60000 });
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
}
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(600); };

// screen name -> { auth: 'none'|'e2e'|'onboard', run(page) }
const screens = {
  landing: { auth: 'none', run: (p) => p.goto(`${BASE}/`) },
  login: { auth: 'none', run: (p) => p.goto(`${BASE}/login`) },
  signup: { auth: 'none', run: (p) => p.goto(`${BASE}/signup`) },
  onboarding: { auth: 'onboard', run: (p) => p.goto(`${BASE}/onboarding`) },
  dashboard: { auth: 'e2e', run: (p) => p.goto(`${BASE}/dashboard`) },
  campaigns: { auth: 'e2e', run: (p) => p.goto(`${BASE}/campaigns`) },
  wizard1: { auth: 'e2e', run: (p) => p.goto(`${BASE}/campaigns/new`) },
  wizard2: { auth: 'e2e', run: async (p) => { await p.goto(`${BASE}/campaigns/new`); await p.fill('#name', 'Audit'); await p.getByRole('button', { name: /^(التالي|Next)$/ }).last().click(); } },
  wizard3: { auth: 'e2e', run: async (p) => {
    await p.goto(`${BASE}/campaigns/new`); await p.fill('#name', 'Audit');
    await p.getByRole('button', { name: /^(التالي|Next)$/ }).last().click();
    await p.fill('#kw', 'مطاعم'); await p.keyboard.press('Enter');
    await p.getByRole('button', { name: /^(التالي|Next)$/ }).last().click();
  } },
  campaign_leads: { auth: 'e2e', run: (p) => p.goto(`${BASE}/campaigns/${state.campaign}`) },
  campaign_review: { auth: 'e2e', run: async (p) => { await p.goto(`${BASE}/campaigns/${state.campaign}`); await p.getByRole('tab').nth(1).click(); } },
  campaign_send: { auth: 'e2e', run: async (p) => { await p.goto(`${BASE}/campaigns/${state.campaign}`); await p.getByRole('tab').nth(2).click(); } },
  leads: { auth: 'e2e', run: (p) => p.goto(`${BASE}/leads`) },
  settings: { auth: 'e2e', run: (p) => p.goto(`${BASE}/settings`) },
};
const names = (only ?? Object.keys(screens)).filter((n) => screens[n]);

let count = 0;
for (const lang of langs) for (const scheme of schemes) for (const w of widths) {
  const mk = async () => {
    const c = await browser.newContext({ viewport: { width: w, height: heights[w] }, colorScheme: scheme, locale: lang === 'ar' ? 'ar-EG' : 'en-US' });
    await c.addCookies([{ name: 'wasla_locale', value: lang, url: BASE }]);
    await c.addInitScript((th) => { try { localStorage.setItem('theme', th); } catch {} }, scheme);
    return c;
  };
  const ctxs = [];
  // one logged-in page per auth kind (own browser context each), reused for the screens that need it
  const pages = {};
  for (const kind of ['none', 'e2e', 'onboard']) {
    if (!names.some((n) => screens[n].auth === kind)) continue;
    const c = await mk();
    ctxs.push(c);
    const page = await c.newPage();
    if (kind === 'e2e') await login(page, state.email, state.password);
    if (kind === 'onboard') await login(page, 'shots-onboard@wasla.test', 'Passw0rd-shots!');
    pages[kind] = page;
  }
  for (const n of names) {
    const s = screens[n];
    const page = pages[s.auth];
    try {
      await s.run(page);
      await settle(page);
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } window.scrollTo(0, 0); });
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${out}/${n}__${w}__${lang}__${scheme}.jpg`, type: 'jpeg', quality: 62, fullPage: true });
      count++;
    } catch (e) {
      console.log('FAILED', n, w, lang, scheme, String(e.message).split('\n')[0]);
    }
  }
  for (const c of ctxs) await c.close();
  console.log('done', lang, scheme, w);
}
await browser.close();
console.log('screenshots:', count);
