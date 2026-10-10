// Sets offer_profile.style_examples for ONE organization: the organization the given user belongs to. Nothing else is touched.
// Usage: node --env-file=.env.local scripts/set-style-examples.mjs <user-email> [--dry]
// It refuses when the user has no organization or more than one (then pass the organization id as a second argument).

const [email, second] = process.argv.slice(2).filter((a) => a !== '--dry');
const dry = process.argv.includes('--dry');
if (!email) throw new Error('usage: set-style-examples.mjs <user-email> [organization-id] [--dry]');
const U = process.env.NEXT_PUBLIC_SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: K, authorization: `Bearer ${K}`, 'content-type': 'application/json' };
const get = async (path) => (await fetch(`${U}${path}`, { headers: h })).json();

// The two reference messages written by the product owner (style references for THIS organization only).
const EXAMPLES = [
  'أهلا يا فريق [اسم النشاط]، عملاءكم دايما بيشكروا في الأفكار الجديدة اللي بتقدموها. إحنا عاملين أداة اسمها وصلة بتجيب لوكالات التسويق شركات محتاجة خدماتها فعلا، ومع كل شركة رسالة جاهزة تتبعت على واتساب. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم؟ محمد من وصلة',
  'أهلا، بنساعد وكالات التسويق في إسكندرية يلاقوا شركات محتاجة خدماتهم، ونجهز لكل شركة رسالة شخصية تتبعت على واتساب. لو حابين، أبعتلكم 10 شركات مناسبة لتخصصكم ببلاش تجربوا بيها. محمد من وصلة',
];

const users = (await get('/auth/v1/admin/users?per_page=500')).users || [];
const user = users.find((u) => String(u.email).toLowerCase() === email.toLowerCase());
if (!user) throw new Error(`no user with email ${email}`);
const mem = await get(`/rest/v1/memberships?user_id=eq.${user.id}&select=organization_id,role,organizations(id,name,offer_profile)`);
let orgs = Array.isArray(mem) ? mem.map((m) => m.organizations).filter(Boolean) : [];
if (second) orgs = orgs.filter((o) => o.id === second);
if (orgs.length !== 1) {
  console.log(`NOT CHANGED: ${email} belongs to ${orgs.length} organizations (need exactly one). Create the organization first (sign in and finish onboarding), or pass its id.`);
  process.exit(2);
}
const org = orgs[0];
const profile = { ...(org.offer_profile || {}), style_examples: EXAMPLES };
console.log(`${dry ? 'DRY RUN: would set' : 'Setting'} style_examples (${EXAMPLES.length}) on "${org.name}" (${org.id}); other fields untouched: ${Object.keys(org.offer_profile || {}).join(', ') || '(none)'}`);
if (!dry) {
  const r = await fetch(`${U}/rest/v1/organizations?id=eq.${org.id}`, { method: 'PATCH', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify({ offer_profile: profile }) });
  if (!r.ok) throw new Error(`update failed: ${r.status} ${await r.text()}`);
  console.log('done');
}
