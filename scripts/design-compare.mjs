// Mobile viewport screenshots (375x812, Arabic, light) of the dashboard, review and send screens for the before/after comparison.
// Usage: node scripts/design-compare.mjs <outDir>
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';

const out = process.argv[2];
const BASE = process.env.BASE || 'http://localhost:3000';
const state = JSON.parse(readFileSync(new URL('./.e2e-state.local.json', import.meta.url), 'utf8'));
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, hasTouch: true, locale: 'ar-EG' });
await ctx.addCookies([{ name: 'wasla_locale', value: 'ar', url: BASE }]);
const page = await ctx.newPage();
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#email');
await page.fill('#email', state.email); await page.fill('#password', state.password); await page.click('button[type=submit]');
await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 });
const shot = async (name) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(700); await page.screenshot({ path: `${out}/${name}.png` }); };
await page.goto(`${BASE}/dashboard`); await shot('dashboard');
await page.goto(`${BASE}/campaigns/${state.campaign}`); await page.getByRole('tab').nth(1).click(); await shot('review');
await page.getByRole('tab').nth(2).click(); await shot('send');
await browser.close();
