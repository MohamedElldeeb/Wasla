// Turns docs/samples/fixtures-run.json (scripts/fixtures-run.mjs) into docs/INSIGHTS_REVIEW.md. No network.
// Usage: node scripts/insights-review.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { computeFacts, buildOpportunities, checkMessage, openingKey, isSocialUrl } from '../lib/insights/core.mjs';

const run = JSON.parse(readFileSync(new URL('../docs/samples/fixtures-run.json', import.meta.url), 'utf8'));
const fx = (city, f) => JSON.parse(readFileSync(new URL(`../docs/samples/fixtures/${city}/${f}.json`, import.meta.url), 'utf8'));
const NOW = Date.parse(process.env.FIXTURE_NOW || '2026-10-10T12:00:00Z');
const draft = run.planner.draft;
const OFFER_PROFILE = { what_we_sell: 'وصلة: بتلاقي عملاء B2B للوكالات وبتكتب رسائل واتساب شخصية لكل عميل', problems_we_solve: 'إن الوكالة تلاقي عملاء جدد ومناسبين وتتواصل معاهم بسرعة', cta_offer: 'أبعتلكم 10 شركات مناسبة لشغلكم ببلاش', sender_name: 'محمد' };
const OFFER_TEXT = [OFFER_PROFILE.what_we_sell, OFFER_PROFILE.problems_we_solve, OFFER_PROFILE.cta_offer].join('. ');
const SIG_AR = {
  activity: ['لا توجد تقييمات حديثة', 'نشط: تقييمات حديثة'], owner_engagement: ['نادرًا ما يرد على التقييمات', 'يرد على التقييمات'],
  unanswered_low_reviews: ['لا توجد تقييمات منخفضة بلا رد', 'توجد تقييمات منخفضة بلا رد'], rating_trend: ['التقييمات الأخيرة أقل من المعتاد', 'التقييمات الأخيرة أفضل من المعتاد'],
  new_business: ['نشاط قائم منذ فترة', 'يبدو نشاطًا جديدًا'], unclaimed_listing: ['الصفحة موثقة', 'صفحة الخرائط غير موثقة'], profile_completeness: ['صفحة ناقصة (صور أو ساعات عمل)', 'صفحة مكتملة'],
  has_website: ['لا يملك موقعًا إلكترونيًا حقيقيًا', 'يملك موقعًا إلكترونيًا'], size_proxy: ['نشاط صغير', 'نشاط كبير أو متعدد الفروع'], review_insights: ['لا شكاوى يمكن لعرضك معالجتها', 'تقييمات تشير إلى مشكلة يعالجها عرضك'],
};
const reasonOf = (f) => (SIG_AR[f.key] ? SIG_AR[f.key][f.side === 'high' ? 1 : 0] : f.key);
const OPP_TXT = {
  unclaimed_listing: (e) => `Maps listing not claimed (${e.reviews} reviews)`, no_website: (e) => `no real website despite ${e.reviews} reviews`,
  thin_profile: (e) => `thin listing: ${e.photos} photos, hours ${e.hours ? 'yes' : 'no'}`, unanswered_low_reviews: (e) => `${e.count} low reviews without a reply in the latest ${e.of}`,
  dormant_activity: (e) => `no new review for ${e.days} days`, declining_rating: (e) => `recent average ${e.recent} vs ${e.overall} overall`,
  low_owner_engagement: (e) => `owner replied to ${Math.round(e.rate * 100)}% of the latest ${e.of} reviews`, new_business: (e) => `looks new (${e.reviews} reviews, all within a year)`,
  multi_branch: (e) => `${e.branches} branches`, review_theme: (e) => `repeated in reviews: ${e.theme} (${e.count})`, weak_search_rank: (e) => `ranks #${e.rank} in its own Maps search`,
};
const AGENCY = (p) => /تسويق|إعلان|دعاية|marketing|advert|agency/i.test(`${p.categoryName} ${(p.categories || []).join(' ')}`) && !/عقار|معدات|مورد/.test(p.categoryName || '');
const fmtPct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : 'n/a');

// ── message audit over everything the writer produced ──
const msgs = [];
for (const [city, c] of Object.entries(run.cities)) for (const l of c.links) { const m = c.messages[l.lead_id]; if (m) msgs.push({ city, name: l.leads.business_name, ...m, lead: l }); }
const okMsgs = msgs.filter((m) => m.ok);
// uniqueness is per campaign (each city here is its own simulated campaign)
const uniqueOpenings = [...new Set(okMsgs.map((m) => m.city))].reduce((n, city) => n + new Set(okMsgs.filter((m) => m.city === city).map((m) => openingKey(m.message))).size, 0);
const audit = okMsgs.map((m) => {
  const raw = m.lead.leads.raw || {};
  const r = checkMessage(m.message, { channel: 'whatsapp', areas: [raw.neighborhood, raw.street ? String(raw.street).split(',')[0] : null].filter(Boolean), city: raw.city, offerText: null, ctaOffer: OFFER_PROFILE.cta_offer, senderName: OFFER_PROFILE.sender_name });
  return r.reasons;
});
const violations = audit.filter((r) => r.length).length;
const retried = msgs.filter((m) => m.attempts > 1).length;
const failed = msgs.filter((m) => !m.ok);
const words = okMsgs.map((m) => m.message.split(/\s+/).filter(Boolean).length);

let md = `# Insights review, round 2 (fixtures, no Apify)

Generated ${new Date().toISOString().slice(0, 10)} by \`scripts/fixtures-run.mjs\` + \`scripts/insights-review.mjs\`. The REAL n8n Code nodes ran on the saved real-run fixtures (\`docs/samples/fixtures/\`), with live OpenRouter calls for the LLM steps (planner ${run.planner.model}, writer ${run.llm.models.writer}; ${run.llm.calls} calls, about $${run.llm.cost_usd}). **Offer used:** "Wasla finds B2B clients for agencies and sends personalized WhatsApp messages", with CTA offer "${OFFER_PROFILE.cta_offer}" and sender "${OFFER_PROFILE.sender_name} من وصلة". "Today" for time-based facts is ${new Date(NOW).toISOString().slice(0, 10)}.

## What changed in round 2

**Fit and categories (section 1 of the brief)**
- One rule, in \`decideFit\` (\`lib/insights/core.mjs\`) and used by the full run and by the probe: inside the allowed categories fit or maybe is kept; outside them only a "fit" backed by the categories, description or website address is kept; "maybe", "not fit" and name-only evidence are removed.
- The fit check now returns \`evidence\` (category, description, website, name_only, none). The name is context only; the prompt says words in a name are not evidence, and that an industry or product word next to the business-type word names what the business sells (the real-estate-marketing case). A "fit" with name-only evidence is removed (the tax office with "B2B" in its name has a test).
- Nothing is learned from the model any more. A category joins the allowed list only from the user: "Looks right" on the probe sample (new button), or a lead the user sent (\`learnCategoryFromSent\`).
- This table now shows the label the pipeline itself used (the earlier "second opinion" column is gone, so the table can no longer contradict the result).
- The planner now runs on ${run.planner.model} (\`OPENROUTER_PLANNER_MODEL\`), asked for 6 to 20 categories covering the service, consultant, company, agency and online wordings.

**Opportunities (section 2)**
- Every planner opportunity must carry \`why_it_means_they_need_the_offer\`; one without it is dropped, and the prompt says to drop benefits the offer does not literally deliver.
- The writer must return \`offer_quote\`, a phrase copied from the offer that states the benefit; the validator rejects a message whose quote is not in the offer, and known invented-benefit phrases.
- With no usable opportunity the message uses a personalization hook: the lead's other Maps categories (specialty) or what customers praise; otherwise a clean general opening.
- Free Maps data now used: search rank (new opportunity \`weak_search_rank\`), all categories (specialty), \`reviewsDistribution\` (share of 1-2 star reviews), and a social page used as the website counts as no real website.

**Messages (section 3)**
- New prompt with the style rules (the example messages are NOT in the global prompt: they are the optional per-organization style_examples, filled here for the Wasla fixture organization), plus validator rules for: no rating or review count, no micro-district, no jargon (B2B), no time-of-day greeting, no "ممكن نتكلم", the concrete \`cta_offer\`, a signature "name من company", 35 to 70 words.
- New offer-profile fields \`cta_offer\` and \`sender_name\`, asked in the onboarding interview and editable on the summary card.
- Variety: the campaign's earlier openings are given to the writer and rejected by the validator, and a new "Dedupe openings" node in WF3 sends a duplicate of the same run back for its single retry.

**This run, measured on the generated messages** (${msgs.length} generated): ${okMsgs.length} valid, ${failed.length} failed after the retry${failed.length ? ` (${[...new Set(failed.map((f) => f.reason))].join(', ')})` : ''}, ${retried} needed the automatic retry. ${uniqueOpenings} of ${okMsgs.length} valid messages have a different first five words within their campaign. Length ${words.length ? `${Math.min(...words)} to ${Math.max(...words)} words` : 'n/a'}. Style audit re-run on the final texts: ${violations} of ${okMsgs.length} violate a rule.


**Still not perfect (honest list)**
- ${failed.length} of ${msgs.length} messages fail even after the one automatic retry (reasons above). They are not saved and not charged; the user can press regenerate. The causes are model variance (a message under 35 words, an assumed need, an occasional invalid JSON reply from the provider), not logic bugs.
- The validator cannot prove a hook is true: "عملاءكم بيشكروا في ..." comes from the review themes, and some models still add an invented need ("شغلكم محتاج ...") that only a pattern check catches.
- A message that still fails after the retry is now stored as a visible "failed" row: the review queue shows the lead with "Couldn't write a good message" and a Try again button (no credit is charged).
- A place counts as "inside the categories" if ANY of its Maps categories is allowed (AIT Systems is a software company that also lists an internet marketing category), so it is delivered as "maybe" with a capped score.
- The offer text is the only source of "what we promise"; if a profile is thin, the quote check rejects more messages.
`;

md += `## 0. What the planner produced for this offer\n\n- **Ideal prospect:** ${draft.ideal_lead_description}\n- **Search phrases (max 4):** ${draft.keywords.join(' · ')}\n- **Synonyms for later rounds:** ${draft.synonyms.join(' · ') || '—'}\n- **Allowed Maps categories (${draft.categories.length}):** ${draft.categories.join(' · ')}\n- **Signals:** ${draft.signals.map((s) => `${s.key} (${s.weight}${s.emphasis ? ', emphasized' : ''})`).join(' · ')}\n- **Opportunity map:** ${draft.opportunities.length ? draft.opportunities.map((o) => `${o.type}: ${o.why_it_means_they_need_the_offer}`).join('\n  - ') : '—'}\n- **Complaints the offer can help with:** ${draft.complaint_relevance || 'none stated (review complaints will not be used as an opportunity)'}\n\n`;

const sections = [];
for (const [city, c] of Object.entries(run.cities)) {
  const places = fx(city, 'places');
  const f = c.funnel;
  md += `## 1. Funnel: ${city}\n\n`;
  md += `| Step | Places |\n|---|---|\n| Found by the search (fixture) | ${f.staged} |\n| Removed: government, utilities, education, hospitals, worship, embassies, military | −${f.removed_global} |\n| Removed: closed | −${f.removed_closed} |\n| Sent to the LLM fit check | ${f.judged} |\n| Removed: outside the allowed categories without a clear fit backed by evidence | −${c.places.filter((p) => p.decision && !p.decision.keep && p.decision.why !== 'not_fit').length} |\n| Removed: not fit (never charged) | −${c.places.filter((p) => p.decision && p.decision.why === 'not_fit').length} |\n| **Delivered (fit or maybe)** | **${f.kept}** |\n\n`;
  md += `No minimum-reviews or mobile-only filter was applied (both are off by default).\n\n`;
  md += `### Every place: gate, fit check, decision\n\nThe fit column is the label the pipeline itself used (one call per place, temperature 0). "inside" / "outside" = the place's Maps categories against the planner's allowed list.\n\n| # | Place | Maps categories | Gate | Fit check: label · evidence · reason | Decision |\n|---|---|---|---|---|---|\n`;
  c.places.forEach((p, i) => {
    const d = p.decision;
    const gate = d ? (d.inside ? 'inside the categories' : 'outside the categories') : p.gate.why;
    const lead = c.links.find((l) => l.leads.google_place_id === p.placeId);
    const result = lead ? `**delivered** (${lead.fit})` : d ? `removed: ${d.why === 'not_fit' ? 'not fit' : d.why === 'name_only_evidence' ? 'fit rested on the name only' : 'outside the categories, not a "fit" with evidence'}` : `removed: ${p.gate.why}`;
    md += `| ${i + 1} | ${p.name} | ${(p.categories && p.categories.length ? p.categories : [p.category]).filter(Boolean).slice(0, 4).join(', ')} | ${gate} | ${d ? `${d.fit} · ${d.evidence || '—'} · ${d.reason}` : 'not sent (removed by a gate)'} | ${result} |\n`;
  });
  md += '\n';

  md += `### ${city === 'cairo' ? '2. Cairo: what is excluded and why, and the new scores' : 'Scores of the delivered leads'}\n\n`;
  const removed = c.places.filter((p) => !c.links.find((l) => l.leads.google_place_id === p.placeId));
  md += `**Excluded (${removed.length}):**\n\n`;
  for (const p of removed) {
    const d = p.decision;
    const why = d ? (d.why === 'not_fit' ? `the fit check said not fit (${d.evidence || 'no evidence'}: ${d.reason})` : d.why === 'name_only_evidence' ? `the fit check said fit but its evidence was the name only (${d.reason}); names are not evidence` : `outside the allowed categories and the fit check said ${d.fit} (evidence: ${d.evidence || '—'}); only "fit" with category, description or website evidence is kept outside`) : p.gate.why.startsWith('global') ? `global exclusion (${p.gate.why.split(':')[1]}) by category "${p.category}"` : p.gate.why;
    md += `- ${p.name}: ${why}\n`;
  }
  md += `\n**Kept, with the opportunity score:**\n\n| Lead | Score | Why (favorable signals) | Cap applied |\n|---|---|---|---|\n`;
  for (const l of c.links) {
    const sc = c.scored.find((s) => s.lead_id === l.lead_id);
    md += `| ${l.leads.business_name} | ${sc && sc.score != null ? sc.score : '—'} | ${sc && sc.favorable.length ? sc.favorable.slice(0, 3).map(reasonOf).join(' · ') : '(none favorable: a low score is a real result)'} | ${sc && sc.capped_by ? sc.capped_by : ''} |\n`;
  }
  md += '\n';
  sections.push([city, places, c]);
}

md += `## 3. Lead briefs and first messages\n\nFor the 8 marketing agencies in the Alexandria fixtures and every kept agency in the Cairo fixtures. Facts are computed in code. Review summaries come from the LLM and show their confidence. Where the fixture has no reviews for a place, the brief uses the Maps listing only and says so. The lead facts (rating, district) are shown to YOU; the writer never receives them.\n\n`;
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
    const dec = (c.places.find((x) => x.placeId === p.placeId) || {}).decision;
    md += `#### ${p.title}\n\n`;
    md += `- **Listing:** ${(facts.categories || [p.categoryName]).join(', ')}; ${p.city || ''}; rating ${p.totalScore ?? '—'} from ${p.reviewsCount ?? 0} reviews; website ${p.website ? (isSocialUrl(p.website) ? 'a social page (counts as none)' : 'yes') : 'no'}; Maps search rank ${facts.search_rank ?? '—'}; phone ${p.phone || '—'}\n`;
    if (!lead) md += `- **Not delivered by the pipeline:** ${dec ? `${dec.fit} · ${dec.evidence || '—'} · ${dec.reason}` : 'did not pass the gates'} (shown for completeness)\n`;
    md += `- **Score:** ${sc && sc.score != null ? sc.score : '—'}${sc && sc.capped_by ? ` (capped: ${sc.capped_by})` : ''}${lead && lead.fit === 'maybe' ? ' · fit: maybe' : ''}\n`;
    md += `- **Facts (code):** activity ${facts.activity_label}${facts.days_since_last_review != null ? ` (last review ${facts.last_review_at.slice(0, 10)}, ${facts.days_since_last_review} days ago)` : ''}; ${facts.n_reviews_fetched} reviews fetched (${facts.n_texts} with text); owner reply rate ${facts.owner_reply_rate == null ? 'n/a' : Math.round(facts.owner_reply_rate * 100) + '%'}; low (1-2★) reviews ${facts.low_reviews}, unanswered ${facts.unanswered_low_reviews}${facts.low_star_share != null ? `, ${Math.round(facts.low_star_share * 100)}% of all its ratings are 1-2★` : ''}; recent avg ${facts.recent_avg_rating ?? 'n/a'}; listing ${facts.unclaimed_listing ? 'UNCLAIMED' : 'claimed'}; photos ${facts.images_count}; hours ${facts.has_hours ? 'yes' : 'no'}; new business: ${facts.is_new_business === true ? 'yes (whole history within a year)' : 'unknown (never assumed old)'}\n`;
    if (analysis && !analysis.skipped) {
      md += `- **What customers say (${analysis.confidence} confidence, ${analysis.n_texts} texts):** ${analysis.summary_en || analysis.summary_ar}${analysis.praised && analysis.praised.length ? `\n  - Praised: ${analysis.praised.map((x) => `${x.theme} (${x.count})`).join(', ')}` : ''}${analysis.complaints && analysis.complaints.length ? `\n  - Complaints seen (shown to you, never put in the message): ${analysis.complaints.map((x) => `${x.theme} (${x.count})${x.offer_can_help ? ' ← the offer can help' : ''}`).join(', ')}` : ''}\n`;
    } else md += `- **What customers say:** ${analysis && analysis.skipped ? `skipped (${analysis.skipped})` : rev.length ? 'not analysed' : 'no reviews in the fixture for this place'}\n`;
    md += `- **Top opportunities (planner's map, real evidence):** ${opps.length ? opps.map((o) => `${o.type} [strength ${o.strength}]: ${(OPP_TXT[o.type] || (() => ''))(o.evidence)}`).join(' | ') : 'none of the offer-relevant opportunity types applies'}\n`;
    if (msg) {
      const wc = msg.message ? msg.message.split(/\s+/).filter(Boolean).length : 0;
      md += `- **First message** (${msg.ok ? `valid${msg.attempts > 1 ? ', after one automatic retry' : ''}` : `rejected: ${msg.reason}`}; ${wc} words; ${msg.opportunity ? `built on: ${msg.opportunity}` : 'no opportunity tied to the offer: personal hook or general opening'}${msg.angle ? `; hook note: ${msg.angle}` : ''}):\n\n  > ${(msg.message || '(none)').replace(/\n/g, '\n  > ')}\n\n`;
    } else md += '\n';
  }
}

// 4. data the spec does not use yet
const all = [['alexandria', fx('alexandria', 'places'), fx('alexandria', 'reviews')], ['cairo', fx('cairo', 'places'), fx('cairo', 'reviews')]];
let social = 0, total = 0, englishReviews = 0, nReviews = 0, local = 0;
const bursts = [];
let ownerLong = 0, ownerReplies = 0;
for (const [city, places, reviews] of all) {
  for (const p of places) { total++; if (p.website && isSocialUrl(p.website)) social++; }
  const byPlace = new Map();
  for (const r of reviews) { nReviews++; if (r.originalLanguage && r.originalLanguage !== 'ar') englishReviews++; if (r.isLocalGuide) local++; if (r.responseFromOwnerText) { ownerReplies++; if (r.responseFromOwnerText.length > 300) ownerLong++; } if (!byPlace.has(r.placeId)) byPlace.set(r.placeId, []); byPlace.get(r.placeId).push(r); }
  for (const [id, rs] of byPlace) {
    const days = new Map();
    rs.forEach((r) => { const d = String(r.publishedAtDate).slice(0, 10); days.set(d, (days.get(d) || 0) + 1); });
    const top = [...days.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 5) bursts.push(`${(places.find((p) => p.placeId === id) || {}).title} (${city}): ${top[1]} of its latest ${rs.length} reviews on ${top[0]}`);
  }
}
md += `## 4. Valuable data the spec does not use yet\n\nUsed since round 2 (free, already in the place data): Maps search rank, all categories (specialty), the rating distribution, and a social page as "website" (${social} of ${total} places here). Still unused:\n\n`;
md += `1. **Review bursts.** ${bursts.length ? bursts.join('; ') : 'none'}. Not used in messages (as requested); useful later as a trust fact about a rating.\n`;
md += `2. **Owner reply content.** ${ownerReplies} reviews have an owner reply; ${ownerLong} of them are long and defensive (over 300 characters). Reply tone separates owners who care about reputation from copy-paste repliers.\n`;
md += `3. **Reviewer language and local-guide share.** ${fmtPct(englishReviews, nReviews)} of the fetched reviews are not in Arabic, and ${fmtPct(local, nReviews)} come from Local Guides. The language mix says whether a business serves expats or international clients.\n`;
md += `4. **Opening hours.** 24-hour claims and Friday/Saturday hours show who is reachable when; the send window could prefer hours when the business is open.\n`;
md += `5. **\`claimThisBusiness\` + photos + hours together** make a free "Maps readiness" fact.\n`;

writeFileSync(new URL('../docs/INSIGHTS_REVIEW.md', import.meta.url), md);
console.log('wrote docs/INSIGHTS_REVIEW.md', md.length);
