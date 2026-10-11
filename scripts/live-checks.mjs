// Live-site checks (Part 5b): desktop two-pane review + keyboard shortcuts, the mobile filter bottom sheet, how far Google sign-in gets,
// and (section 4) a trial account created through "جرب مجانا" that goes through onboarding and the wizard up to the start button.
// By default NOTHING is spent. Add --with-demo (before deploys) to also start the 10-lead campaign: that runs a real Apify job (about 0.2 USD) and waits for it.
// Usage: node --env-file=.env.local scripts/live-checks.mjs [outDir]    (BASE defaults to the production URL)
// It uses the e2e test account (see scripts/e2e-pipeline.mjs). Message statuses it changes are restored through the service role at the end.
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE || 'https://wasla-henna.vercel.app';
const out = process.argv[2] || 'docs/live-checks';
mkdirSync(out, { recursive: true });
const state = JSON.parse(readFileSync(new URL('./.e2e-state.local.json', import.meta.url), 'utf8'));
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(ok ? 'PASS' : 'FAIL', name, detail); };

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });

async function login(ctx) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#email', { timeout: 60000 });
  await page.fill('#email', state.email);
  await page.fill('#password', state.password);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45000 });
  return page;
}
const settle = async (p) => { await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(800); };
const rest = async (path, init = {}) => (await fetch(`${SB}/rest/v1/${path}`, { ...init, headers: { apikey: SR, authorization: `Bearer ${SR}`, 'content-type': 'application/json', ...(init.headers || {}) } })).json().catch(() => null);

// snapshot of message statuses so we can restore them
const before = (await rest(`messages?campaign_id=eq.${state.campaign}&select=id,review_status,edited_text&order=created_at`)) || [];

// ───── 1. desktop two-pane review with keyboard shortcuts ─────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'en-US' });
  await ctx.addCookies([{ name: 'wasla_locale', value: 'en', url: BASE }]);
  const page = await login(ctx);
  await page.goto(`${BASE}/campaigns/${state.campaign}`);
  await settle(page);
  await page.getByRole('tab').nth(1).click();
  await settle(page);
  const aside = page.locator('aside[aria-label]').first();
  check('desktop review: list pane (left/start) is visible next to the message pane', await aside.isVisible());
  const items = aside.locator('button');
  const n = await items.count();
  check('desktop review: the list shows pending messages', n >= 2, `${n} items`);
  const current = async () => items.evaluateAll((els) => els.findIndex((e) => e.getAttribute('aria-current') === 'true'));
  const startIdx = await current();
  await page.keyboard.press('j');
  await page.waitForTimeout(250);
  const afterJ = await current();
  check('shortcut J moves to the next lead', afterJ === startIdx + 1, `${startIdx} -> ${afterJ}`);
  await page.keyboard.press('k');
  await page.waitForTimeout(250);
  check('shortcut K moves back', (await current()) === startIdx);
  await page.keyboard.press('r');
  await page.waitForTimeout(250);
  const regenInput = page.getByPlaceholder(/instruction|تعليمات|أضف/i).first();
  const regenOpen = await page.locator('input[maxlength="200"]').first().isVisible().catch(() => false);
  check('shortcut R opens the regenerate panel', regenOpen);
  await page.keyboard.press('r');
  await page.waitForTimeout(250);
  check('shortcut R again closes it', !(await page.locator('input[maxlength="200"]').first().isVisible().catch(() => false)));
  void regenInput;
  check('typing in the message box does not trigger shortcuts', await (async () => {
    await page.getByTestId('message-card').locator('textarea').click();
    const idx0 = await current();
    await page.keyboard.type('jk');
    await page.waitForTimeout(200);
    return (await current()) === idx0;
  })());
  const approveBadgeBefore = await page.getByTestId('message-card').innerText();
  await page.keyboard.press('Control+z'); await page.locator('h1').first().click().catch(() => {}); await page.locator('textarea').first().evaluate((e) => e.blur());
  await page.keyboard.press('a');
  await page.waitForTimeout(2500);
  const approvedNow = await rest(`messages?campaign_id=eq.${state.campaign}&review_status=eq.approved&select=id`);
  const approvedBefore = before.filter((m) => m.review_status === 'approved').length;
  check('shortcut A approves the selected message (saved in the database)', Array.isArray(approvedNow) && approvedNow.length === approvedBefore + 1, `${approvedBefore} -> ${approvedNow?.length}`);
  await page.screenshot({ path: `${out}/desktop-review.png` });
  void approveBadgeBefore;
  await ctx.close();
}

// ───── 2. mobile filter bottom sheet ─────
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, locale: 'en-US' });
  await ctx.addCookies([{ name: 'wasla_locale', value: 'en', url: BASE }]);
  const page = await login(ctx);
  await page.goto(`${BASE}/campaigns/${state.campaign}`);
  await settle(page);
  const filterBtn = page.getByRole('button', { name: /^Filter/ }).first();
  check('mobile: the filter button is visible on the leads tab', await filterBtn.isVisible());
  const cardsBefore = await page.locator('[data-testid="lead-card"]').count();
  await filterBtn.click();
  await page.waitForTimeout(500);
  const dialog = page.getByRole('dialog');
  check('mobile: the filter opens as a dialog', await dialog.isVisible());
  const box = await dialog.boundingBox();
  const vh = 812;
  check('mobile: the dialog is a bottom sheet (touches the bottom edge, full width)', !!box && Math.abs(box.y + box.height - vh) < 3 && box.width >= 370, JSON.stringify(box));
  await page.screenshot({ path: `${out}/mobile-filter-sheet.png` });
  const touch = await dialog.locator('button').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().height > 0).map((e) => Math.round(e.getBoundingClientRect().height)));
  check('mobile: sheet buttons are at least 40px tall (48px touch targets)', touch.every((h) => h >= 40), touch.join(','));
  await dialog.getByRole('radio', { name: /^High|Mobile|Landline|Has/ }).first().click().catch(() => {});
  await dialog.getByRole('button', { name: /^Show results/ }).click();
  await page.waitForTimeout(600);
  const cardsAfter = await page.locator('[data-testid="lead-card"]').count();
  check('mobile: applying a filter changes the list (or keeps it when it matches all)', cardsAfter <= cardsBefore, `${cardsBefore} -> ${cardsAfter}`);
  await page.getByRole('button', { name: /^Filter/ }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('dialog').getByRole('button', { name: /^Reset/ }).click();
  await page.waitForTimeout(500);
  check('mobile: reset restores the full list', (await page.locator('[data-testid="lead-card"]').count()) === cardsBefore);
  await ctx.close();
}

// ───── 3. Google sign-in: how far automation can go without the user's Google account ─────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'en-US' });
  await ctx.addCookies([{ name: 'wasla_locale', value: 'en', url: BASE }]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {}); // the button is a client component: click only after hydration
  const btn = page.getByRole('button', { name: /google/i }).first();
  check('google: the button is present on the login page', await btn.isVisible());
  const nav = page.waitForURL((u) => /accounts\.google\.com/.test(u.hostname), { timeout: 30000 }).then(() => true).catch(() => false);
  await btn.click();
  const reached = await nav;
  const url = reached ? new URL(page.url()) : null;
  check('google: sign-in redirects to Google (accounts.google.com)', reached, url ? url.hostname : page.url());
  if (url) {
    const redirectUri = url.searchParams.get('redirect_uri') || '';
    check('google: the OAuth client id is configured', !!url.searchParams.get('client_id'), (url.searchParams.get('client_id') || '').slice(0, 14) + '…');
    check('google: Google will send the user back to the Supabase callback', /supabase\.co\/auth\/v1\/callback/.test(redirectUri), redirectUri);
    await page.screenshot({ path: `${out}/google-chooser.png` });
  }
  await ctx.close();
}

// ───── 4. sign up through "جرب مجانا" and go through the wizard (the real Apify run happens only with --with-demo) ─────
const withDemo = process.argv.includes('--with-demo');
{
  const t0 = new Date(Date.now() - 5000).toISOString();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ar-EG' });
  await ctx.addCookies([{ name: 'wasla_locale', value: 'ar', url: BASE }]);
  const page = await ctx.newPage();
  const actions = [];
  page.on('response', async (r) => {
    if (r.request().method() === 'POST' && r.request().headers()['next-action']) actions.push(r.status());
  });
  let demoUser = null;
  let orgId = null;
  try {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.getByTestId('try-demo').first().click();
    await page.waitForURL((u) => u.pathname === '/onboarding', { timeout: 90000 });
    check('demo: "جرب مجانا" creates a trial account and opens onboarding', true);

    await page.waitForLoadState('networkidle');
    await page.getByLabel('اسم نشاطك').fill('اختبار حي');
    await page.getByRole('button', { name: /تخطي المقابلة/ }).click();
    await page.waitForSelector('#f-what_we_sell');
    await page.fill('#f-what_we_sell', 'نظام محاسبة سحابي للشركات الصغيرة');
    await page.fill('#f-ideal_customer', 'مطاعم ومحلات صغيرة');
    await page.fill('#f-regions', 'القاهرة');
    await page.getByRole('button', { name: /تأكيد وإكمال/ }).click();
    await page.waitForURL((u) => u.pathname === '/dashboard', { timeout: 90000 });
    check('demo: the profile is saved and the dashboard opens', true);

    const users = (await (await fetch(`${SB}/auth/v1/admin/users?per_page=500`, { headers: { apikey: SR, authorization: `Bearer ${SR}` } })).json()).users || [];
    demoUser = users.filter((u) => /@demo\.wasla\.app$/.test(u.email) && u.created_at >= t0).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const mem = demoUser ? await rest(`memberships?user_id=eq.${demoUser.id}&select=organization_id`) : [];
    orgId = mem && mem[0] && mem[0].organization_id;
    const bal0 = orgId ? await (await fetch(`${SB}/rest/v1/rpc/org_credit_balance`, { method: 'POST', headers: { apikey: SR, authorization: `Bearer ${SR}`, 'content-type': 'application/json' }, body: JSON.stringify({ org: orgId }) })).json() : null;
    check('demo: the new account gets its free credits', Number(bal0) === 50, `balance ${bal0}`);

    await page.goto(`${BASE}/campaigns/new`, { waitUntil: 'networkidle' });
    await page.fill('#name', 'فحص حي');
    await page.getByRole('button', { name: /^التالي$/ }).last().click();
    // locations are picked from the list (Arabic and English), never typed as free text
    await page.fill('#loc', 'smouha');
    const opt = page.getByRole('option').first();
    await opt.waitFor({ timeout: 10000 });
    const optText = (await opt.innerText()).replace(/\s+/g, ' ');
    check('locations: autocomplete finds "smouha" with its Arabic and English names', /سموحة/.test(optText) && /Smouha/.test(optText), optText);
    await opt.click();
    check('locations: the picked place is added as an area', (await page.locator('main').innerText()).includes('سموحة'));
    await page.fill('#loc', 'zzzzqq');
    check('locations: a name that is not in the list offers nothing to add', (await page.getByRole('option').count()) === 0);
    await page.fill('#loc', '');
    await page.fill('#kw', 'مطاعم');
    await page.keyboard.press('Enter');
    await page.locator('#max').evaluate((el) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, '10'); el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.getByRole('button', { name: /^التالي$/ }).last().click();
    await page.waitForTimeout(800);
    const start = page.getByRole('button', { name: /بدء الحملة/ });
    const label = (await start.innerText()).replace(/\s+/g, ' ');
    check('wizard: the cost is shown on the start button before starting', /بدء الحملة · \d+ رصيد/.test(label), label);
    check('wizard: a free account can start 10 prospects (button enabled)', await start.isEnabled());
    if (!withDemo) {
      console.log('   (the 10-lead run was not started: add --with-demo to run it)');
      throw new Error('__stop__');
    }
    await start.click();
    await page.waitForURL((u) => /^\/campaigns\/[0-9a-f-]{36}$/.test(u.pathname), { timeout: 60000 });
    const campaignId = page.url().split('/').pop();
    const alertText = (await page.locator('[role=alert]').allInnerTexts()).join(' ');
    check('start: no error is shown after pressing start', !/حدث خطأ|رصيدك غير كافٍ|المرجع/.test(alertText), alertText.slice(0, 120));

    // wait for the job: succeeded with leads, and no credits left reserved
    let job = null;
    for (let i = 0; i < 48; i++) {
      const jobs = await rest(`jobs?campaign_id=eq.${campaignId}&type=eq.ingest&select=status,error,credits_reserved,credits_used,counts`);
      job = jobs && jobs[0];
      if (job && ['succeeded', 'failed', 'cancelled'].includes(job.status)) break;
      await new Promise((r) => setTimeout(r, 10000));
    }
    check('end to end: the ingest job succeeded', job?.status === 'succeeded', JSON.stringify({ status: job?.status, error: job?.error }));
    const leads = await rest(`campaign_leads?campaign_id=eq.${campaignId}&select=id`);
    check('end to end: prospects were delivered', Array.isArray(leads) && leads.length >= 1, `${leads?.length ?? 0} prospects`);
    const ledger = await rest(`credit_ledger?organization_id=eq.${orgId}&select=kind,amount,job_id`);
    const open = (ledger || []).filter((l) => l.kind === 'reserve').filter((l) => !(ledger || []).some((x) => x.job_id === l.job_id && (x.kind === 'settle' || x.kind === 'refund')));
    check('credits: nothing stays reserved after the job', open.length === 0, `${open.length} open reservations`);
    check('server actions: every call answered 200', actions.length > 0 && actions.every((s) => s === 200), actions.join(','));
    await page.screenshot({ path: `${out}/demo-campaign.png` });
  } catch (e) {
    if (String(e.message) !== '__stop__') check('demo end-to-end flow completed', false, String(e.message).split('\n')[0]);
    await page.screenshot({ path: `${out}/demo-failure.png` }).catch(() => {});
  } finally {
    // the trial account and its data are removed (the organization cascades)
    if (orgId) await fetch(`${SB}/rest/v1/organizations?id=eq.${orgId}`, { method: 'DELETE', headers: { apikey: SR, authorization: `Bearer ${SR}` } }).catch(() => {});
    if (demoUser) await fetch(`${SB}/auth/v1/admin/users/${demoUser.id}`, { method: 'DELETE', headers: { apikey: SR, authorization: `Bearer ${SR}` } }).catch(() => {});
    await ctx.close();
  }
}

// restore any message status the checks changed
const after = (await rest(`messages?campaign_id=eq.${state.campaign}&select=id,review_status&order=created_at`)) || [];
for (const m of after) {
  const was = before.find((x) => x.id === m.id);
  if (was && was.review_status !== m.review_status) {
    await rest(`messages?id=eq.${m.id}`, { method: 'PATCH', body: JSON.stringify({ review_status: was.review_status, edited_text: was.edited_text }), headers: { Prefer: 'return=minimal' } });
    console.log('restored', m.id, m.review_status, '->', was.review_status);
  }
}
await browser.close();
writeFileSync(`${out}/results.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
