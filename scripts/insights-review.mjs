// Turns docs/samples/fixtures-run.json (scripts/fixtures-run.mjs) into docs/INSIGHTS_REVIEW.md. No network.
// Usage: node scripts/insights-review.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { computeFacts, signalValues, buildOpportunities } from '../lib/insights/core.mjs';

const run = JSON.parse(readFileSync(new URL('../docs/samples/fixtures-run.json', import.meta.url), 'utf8'));
const fx = (city, f) => JSON.parse(readFileSync(new URL(`../docs/samples/fixtures/${city}/${f}.json`, import.meta.url), 'utf8'));
const NOW = Date.parse(process.env.FIXTURE_NOW || '2026-10-10T12:00:00Z');
const draft = run.planner.draft;
const SIG_AR = {
  activity: ['لا توجد تقييمات حديثة', 'نشط: تقييمات حديثة'], owner_engagement: ['نادرًا ما يرد على التقييمات', 'يرد على التقييمات'],
  unanswered_low_reviews: ['لا توجد تقييمات منخفضة بلا رد', 'توجد تقييمات منخفضة بلا رد'], rating_trend: ['التقييمات الأخيرة أقل من المعتاد', 'التقييمات الأخيرة أفضل من المعتاد'],
  new_business: ['نشاط قائم منذ فترة', 'يبدو نشاطًا جديدًا'], unclaimed_listing: ['الصفحة موثقة', 'صفحة الخرائط غير موثقة'], profile_completeness: ['صفحة ناقصة (صور أو ساعات عمل)', 'صفحة مكتملة'],
  has_website: ['لا يملك موقعًا إلكترونيًا', 'يملك موقعًا إلكترونيًا'], size_proxy: ['نشاط صغير', 'نشاط كبير أو متعدد الفروع'], review_insights: ['لا شكاوى يمكن لعرضك معالجتها', 'تقييمات تشير إلى مشكلة يعالجها عرضك'],
};
const reasonOf = (f) => (SIG_AR[f.key] ? SIG_AR[f.key][f.side === 'high' ? 1 : 0] : f.key);
const OPP_TXT = {
  unclaimed_listing: (e) => `Maps listing not claimed (${e.reviews} reviews)`, no_website: (e) => `no website despite ${e.reviews} reviews`,
  thin_profile: (e) => `thin listing: ${e.photos} photos, hours ${e.hours ? 'yes' : 'no'}`, unanswered_low_reviews: (e) => `${e.count} low reviews without a reply in the latest ${e.of}`,
  dormant_activity: (e) => `no new review for ${e.days} days`, declining_rating: (e) => `recent average ${e.recent} vs ${e.overall} overall`,
  low_owner_engagement: (e) => `owner replied to ${Math.round(e.rate * 100)}% of the latest ${e.of} reviews`, new_business: (e) => `looks new (${e.reviews} reviews, all within a year)`,
  multi_branch: (e) => `${e.branches} branches`, review_theme: (e) => `repeated in reviews: ${e.theme} (${e.count})`,
};
const AGENCY = (p) => /تسويق|إعلان|دعاية|marketing|advert|agency/i.test(`${p.categoryName} ${(p.categories || []).join(' ')}`) && !/عقار|معدات|مورد/.test(p.categoryName || '');
const fmtPct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : 'n/a');

let md = `# Insights review (fixtures, no Apify)\n\nGenerated ${new Date().toISOString().slice(0, 10)} by \`scripts/fixtures-run.mjs\` + \`scripts/insights-review.mjs\`. The REAL n8n Code nodes ran on the saved real-run fixtures (\`docs/samples/fixtures/\`), with live OpenRouter calls for the LLM steps (planner ${run.planner.model}, writer ${run.llm.models.writer}; ${run.llm.calls} calls, about $${run.llm.cost_usd}). **Offer used:** "Wasla finds B2B clients for agencies and sends personalized WhatsApp messages". "Today" for time-based facts is ${new Date(NOW).toISOString().slice(0, 10)}.\n\n`;

md += `## 0. What the planner produced for this offer\n\n- **Ideal prospect:** ${draft.ideal_lead_description}\n- **Search phrases (max 4):** ${draft.keywords.join(' · ')}\n- **Synonyms for later rounds:** ${draft.synonyms.join(' · ') || '—'}\n- **Allowed Maps categories:** ${draft.categories.join(' · ')}\n- **Signals:** ${draft.signals.map((s) => `${s.key} (${s.weight}${s.emphasis ? ', emphasized' : ''})`).join(' · ')}\n- **Opportunity map:** ${draft.opportunities.map((o) => `${o.type}`).join(' · ') || '—'}\n- **Complaints the offer can help with:** ${draft.complaint_relevance || 'none stated (review complaints will not be used as an opportunity)'}\n\n`;

const sections = [];
for (const [city, c] of Object.entries(run.cities)) {
  const places = fx(city, 'places');
  const f = c.funnel;
  md += `## 1. Funnel: ${city}\n\n`;
  md += `| Step | Places |\n|---|---|\n| Found by the search (fixture) | ${f.staged} |\n| Removed: government, utilities, education, hospitals, worship, embassies, military | −${f.removed_global} |\n| Removed: closed | −${f.removed_closed} |\n| Removed: outside the allowed categories and not judged clearly fit | −${f.removed_category} |\n| Removed: other filters / landline filter | −${f.removed_filters + f.removed_landline} |\n| Sent to the LLM fit check (inside or outside the categories) | ${f.judged} |\n| Removed: not fit (never charged) | −${(f.droppedFit || []).length} |\n| **Delivered (fit or maybe)** | **${f.kept}** |\n\n`;
  md += `No minimum-reviews or mobile-only filter was applied (both are off by default now).\n\n`;
  md += `### Every place: gate verdict and fit label\n\n"Fit check (all)" is a second opinion run on EVERY place, including those the deterministic gates removed, so you can see what the gates would have missed or over-removed.\n\n| # | Place | Maps category | Gate | Fit check (all): label, reason | Result |\n|---|---|---|---|---|---|\n`;
  c.places.forEach((p, i) => {
    const gate = p.gate.outside ? 'outside categories → fit check decides' : p.gate.pass ? 'pass' : p.gate.why;
    const lead = c.links.find((l) => l.leads.google_place_id === p.placeId);
    const dropped = (f.droppedFit || []).find((d) => d.name === p.name);
    const result = lead ? `**delivered** (${lead.fit}${p.gate.outside ? ', category learned' : ''})` : dropped ? `removed: not fit` : p.gate.outside ? 'removed: outside the allowed categories and not clearly fit' : p.gate.pass ? 'not delivered' : `removed: ${gate}`;
    md += `| ${i + 1} | ${p.name} | ${p.category || ''} | ${gate} | ${p.fit ? `${p.fit.fit}: ${p.fit.reason}` : 'no label'} | ${result} |\n`;
  });
  md += '\n';

  // 2. what was excluded and why / new scores
  md += `### ${city === 'cairo' ? '2. Cairo: what is excluded and why, and the new scores' : 'Scores of the delivered leads'}\n\n`;
  const removed = c.places.filter((p) => !c.links.find((l) => l.leads.google_place_id === p.placeId));
  md += `**Excluded (${removed.length}):**\n\n`;
  for (const p of removed) {
    const why = p.gate.outside ? `category "${p.category}" is outside the allowed list and the fit check did not call it a clear fit (${p.fit ? `${p.fit.fit}: ${p.fit.reason}` : 'no label'}); the name is never used on its own` : p.gate.pass ? `fit check: ${p.fit ? `${p.fit.fit}, ${p.fit.reason}` : 'not delivered'}` : p.gate.why.startsWith('global') ? `global exclusion (${p.gate.why.split(':')[1]}) by category "${p.category}"` : p.gate.why === 'category' ? `category "${p.category}" is not one of the allowed categories (name is never used on its own)` : p.gate.why;
    md += `- ${p.name}: ${why}\n`;
  }
  md += `\n**Kept, with the new opportunity score:**\n\n| Lead | Score | Why (favorable signals) | Cap applied |\n|---|---|---|---|\n`;
  for (const l of c.links) {
    const sc = c.scored.find((s) => s.lead_id === l.lead_id);
    md += `| ${l.leads.business_name} | ${sc && sc.score != null ? sc.score : '—'} | ${sc && sc.favorable.length ? sc.favorable.slice(0, 3).map(reasonOf).join(' · ') : '(none favorable: a low score is a real result)'} | ${sc && sc.capped_by ? sc.capped_by : ''} |\n`;
  }
  md += '\n';
  sections.push([city, places, c]);
}

md += `## 3. Lead briefs and first messages\n\nFor the 8 marketing agencies in the Alexandria fixtures and every kept agency in the Cairo fixtures. Facts are computed in code. Review summaries come from the LLM and show their confidence. Where the fixture has no reviews for a place (the old run dropped those leads before the reviews step), the brief uses the Maps listing only and says so.\n\n`;
for (const [city, places, c] of sections) {
  const reviews = fx(city, 'reviews');
  const chosen = city === 'alexandria' ? places.filter(AGENCY) : c.links.map((l) => places.find((p) => p.placeId === l.leads.google_place_id)).filter(Boolean);
  md += `### ${city} (${chosen.length})\n\n`;
  for (const p of chosen) {
    const lead = c.links.find((l) => l.leads.google_place_id === p.placeId);
    const rev = reviews.filter((r) => r.placeId === p.placeId);
    const facts = computeFacts(p, rev, { now: NOW });
    const ins = lead ? c.insights.find((i) => i.lead_id === lead.lead_id) : null;
    const analysis = ins ? ins.analysis : null;
    const opps = lead ? (c.opps.find((o) => o.lead_id === lead.lead_id) || {}).opportunities || [] : buildOpportunities(facts, null, draft.opportunities);
    const sc = lead ? c.scored.find((s) => s.lead_id === lead.lead_id) : null;
    const msg = lead ? c.messages[lead.lead_id] : null;
    md += `#### ${p.title}\n\n`;
    md += `- **Listing:** ${p.categoryName}; ${p.city || ''}; rating ${p.totalScore ?? '—'} from ${p.reviewsCount ?? 0} reviews; website ${p.website ? 'yes' : 'no'}; phone ${p.phone || '—'}\n`;
    if (!lead) md += `- **Not delivered by the pipeline:** ${(run.cities[city].funnel.droppedFit || []).find((d) => d.name === p.title)?.reason || 'did not pass the gates'} (shown for completeness)\n`;
    md += `- **Score:** ${sc && sc.score != null ? sc.score : '—'}${sc && sc.capped_by ? ` (capped: ${sc.capped_by})` : ''}${lead && lead.fit === 'maybe' ? ' · fit: maybe' : ''}\n`;
    md += `- **Facts (code):** activity ${facts.activity_label}${facts.days_since_last_review != null ? ` (last review ${facts.last_review_at.slice(0, 10)}, ${facts.days_since_last_review} days ago)` : ''}; ${facts.n_reviews_fetched} reviews fetched (${facts.n_texts} with text); owner reply rate ${facts.owner_reply_rate == null ? 'n/a' : Math.round(facts.owner_reply_rate * 100) + '%'}; low (1-2★) reviews ${facts.low_reviews}, unanswered ${facts.unanswered_low_reviews}; recent avg ${facts.recent_avg_rating ?? 'n/a'}; listing ${facts.unclaimed_listing ? 'UNCLAIMED' : 'claimed'}; photos ${facts.images_count}; hours ${facts.has_hours ? 'yes' : 'no'}; new business: ${facts.is_new_business === true ? 'yes (whole history within a year)' : 'unknown (never assumed old)'}\n`;
    if (analysis && !analysis.skipped) {
      md += `- **What customers say (${analysis.confidence} confidence, ${analysis.n_texts} texts):** ${analysis.summary_en || analysis.summary_ar}${analysis.praised && analysis.praised.length ? `\n  - Praised: ${analysis.praised.map((x) => `${x.theme} (${x.count})`).join(', ')}` : ''}${analysis.complaints && analysis.complaints.length ? `\n  - Complaints seen (shown to you, never put in the message): ${analysis.complaints.map((x) => `${x.theme} (${x.count})${x.offer_can_help ? ' ← the offer can help' : ''}`).join(', ')}` : ''}\n`;
    } else md += `- **What customers say:** ${analysis && analysis.skipped ? `skipped (${analysis.skipped})` : rev.length ? 'not analysed' : 'no reviews in the fixture for this place'}\n`;
    md += `- **Top opportunities (planner's map, real evidence):** ${opps.length ? opps.map((o) => `${o.type} [strength ${o.strength}]: ${(OPP_TXT[o.type] || (() => ''))(o.evidence)}`).join(' | ') : 'none of the offer-relevant opportunity types applies'}\n`;
    if (msg) md += `- **First message** (${msg.ok ? `valid${msg.attempts > 1 ? ', after one automatic retry' : ''}` : `rejected: ${msg.reason}`}; built on: ${msg.opportunity || 'general offer'}):\n\n  > ${(msg.message || '(none)').replace(/\n/g, '\n  > ')}\n\n`;
    else md += '\n';
  }
}

// 4. data the spec does not use yet
const all = [['alexandria', fx('alexandria', 'places'), fx('alexandria', 'reviews')], ['cairo', fx('cairo', 'places'), fx('cairo', 'reviews')]];
let social = 0, total = 0, englishReviews = 0, nReviews = 0, local = 0;
const bursts = [];
let ownerLong = 0, ownerReplies = 0;
for (const [city, places, reviews] of all) {
  for (const p of places) { total++; if (p.website && /facebook\.com|instagram\.com|wa\.me/i.test(p.website)) social++; }
  const byPlace = new Map();
  for (const r of reviews) { nReviews++; if (r.originalLanguage && r.originalLanguage !== 'ar') englishReviews++; if (r.isLocalGuide) local++; if (r.responseFromOwnerText) { ownerReplies++; if (r.responseFromOwnerText.length > 300) ownerLong++; } if (!byPlace.has(r.placeId)) byPlace.set(r.placeId, []); byPlace.get(r.placeId).push(r); }
  for (const [id, rs] of byPlace) {
    const days = new Map();
    rs.forEach((r) => { const d = String(r.publishedAtDate).slice(0, 10); days.set(d, (days.get(d) || 0) + 1); });
    const top = [...days.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 5) bursts.push(`${(places.find((p) => p.placeId === id) || {}).title} (${city}): ${top[1]} of its latest ${rs.length} reviews on ${top[0]}`);
  }
}
const ranks = all.flatMap(([, places]) => places.map((p) => p.rank).filter(Number.isFinite));
md += `## 4. Data in the fixtures that the spec does not use yet\n\n`;
md += `1. **Review bursts.** ${bursts.length ? bursts.join('; ') : 'none'}. Many reviews on one day is how some businesses solicit or buy reviews. A "review velocity looks organic" fact would help judge whether a high rating can be trusted, and tells us the business already invests in reputation (a buyer for reputation or marketing offers).\n`;
md += `2. **Maps search rank** (\`rank\`, \`searchString\`): every place records its rank for the query. The median rank in these fixtures is ${ranks.sort((a, b) => a - b)[Math.floor(ranks.length / 2)] ?? 'n/a'}. A business that ranks low for its own category query has a visibility problem, which is a strong hook for any marketing or discovery offer, and costs nothing to keep.\n`;
md += `3. **Website is a social page.** ${social} of ${total} places list a Facebook/Instagram/WhatsApp page as their "website". Today they count as "has a website". Treating them as "no real website" gives a more accurate website signal.\n`;
md += `4. **Owner reply content.** ${ownerReplies} reviews have an owner reply; ${ownerLong} of them are long and defensive (over 300 characters, usually answering a 1-star review). Reply tone and length separate owners who care about reputation (good prospects for reputation tools) from copy-paste "thank you" repliers.\n`;
md += `5. **Reviewer language and local-guide share.** ${fmtPct(englishReviews, nReviews)} of the fetched reviews are not in Arabic, and ${fmtPct(local, nReviews)} come from Local Guides. The language mix says whether a business serves expats or international clients, which changes the right message language.\n`;
md += `6. **Rating distribution** (\`reviewsDistribution\`) is already in the place data: the share of 1-star reviews over the full history is more reliable than the 10 newest reviews for "how many unhappy customers", and costs no credits.\n`;
md += `7. **Opening hours.** 24-hour claims and Friday/Saturday hours show who is reachable when; the send window could prefer hours when the business is open.\n`;
md += `8. **Several categories on one listing** (e.g. a software company also listed as marketing, hosting and web design) is a stronger sign of what the business really sells than the primary category; the fit check already reads all categories.\n`;
md += `9. **\`claimThisBusiness\` + photos + hours together** make a "Maps readiness" fact that is free and was the strongest opportunity for several offers here.\n`;

writeFileSync(new URL('../docs/INSIGHTS_REVIEW.md', import.meta.url), md);
console.log('wrote docs/INSIGHTS_REVIEW.md', md.length);
