// Landing page screenshots (DESIGN v2 section 7): real Wasla components rendered at /preview with sample data (needs PREVIEW_ROUTES=1 and `next dev`).
// Usage: node scripts/landing-shots.mjs   -> public/landing/<shot>-<locale>-<theme>.jpg
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3000';
mkdirSync('public/landing', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
for (const locale of ['ar', 'en']) for (const theme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 820, height: 900 }, deviceScaleFactor: 1.5, locale: locale === 'ar' ? 'ar-EG' : 'en-US' });
  await ctx.addCookies([{ name: 'wasla_locale', value: locale, url: BASE }]);
  await ctx.addInitScript((th) => { try { localStorage.setItem('theme', th); } catch {} }, theme);
  const page = await ctx.newPage();
  for (const shot of ['review', 'brief', 'funnel']) {
    await page.goto(`${BASE}/preview?show=${shot}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const el = page.locator(`[data-shot="${shot}"] > *`).first();
    await el.screenshot({ path: `public/landing/${shot}-${locale}-${theme}.jpg`, type: 'jpeg', quality: 82 });
    console.log(shot, locale, theme);
  }
  await ctx.close();
}
await browser.close();
