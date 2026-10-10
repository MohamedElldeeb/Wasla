// Platform-admin tool (there is no admin screen yet, Phase 4): tops an organization up to a target credit balance with a 'grant' ledger row.
// Usage: node --env-file=.env.local scripts/grant-credits.mjs <user-email> <target-balance> [--apply]
// Without --apply it only prints what it would do. The organization is the one the user belongs to (must be exactly one).
const [email, targetArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const apply = process.argv.includes('--apply');
const target = Number(targetArg);
if (!email || !Number.isInteger(target) || target < 0) throw new Error('usage: grant-credits.mjs <user-email> <target-balance> [--apply]');
const U = process.env.NEXT_PUBLIC_SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: K, authorization: `Bearer ${K}`, 'content-type': 'application/json' };
const get = async (path) => (await fetch(`${U}${path}`, { headers: h })).json();

const users = (await get('/auth/v1/admin/users?per_page=500')).users || [];
const user = users.find((u) => String(u.email).toLowerCase() === email.toLowerCase());
if (!user) throw new Error(`no user with email ${email}`);
const mem = await get(`/rest/v1/memberships?user_id=eq.${user.id}&select=organization_id,organizations(id,name)`);
const orgs = Array.isArray(mem) ? mem.map((m) => m.organizations).filter(Boolean) : [];
if (orgs.length !== 1) {
  console.log(`NOT CHANGED: ${email} belongs to ${orgs.length} organizations (need exactly one). Finish onboarding first.`);
  process.exit(2);
}
const org = orgs[0];
const balRes = await fetch(`${U}/rest/v1/rpc/org_credit_balance`, { method: 'POST', headers: h, body: JSON.stringify({ org: org.id }) });
const balance = Number(await balRes.json());
const diff = target - balance;
console.log(`"${org.name}" (${org.id}): balance ${balance}, target ${target}, grant ${Math.max(diff, 0)}`);
if (diff <= 0) { console.log('Nothing to grant.'); process.exit(0); }
if (!apply) { console.log('Dry run. Add --apply to write the ledger row.'); process.exit(0); }
const r = await fetch(`${U}/rest/v1/credit_ledger`, { method: 'POST', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify({ organization_id: org.id, amount: diff, kind: 'grant', reason: `admin top-up to ${target}` }) });
if (!r.ok) throw new Error(`insert failed: ${r.status} ${await r.text()}`);
console.log('done');
