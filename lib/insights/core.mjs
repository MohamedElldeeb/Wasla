// Lead insights core (spec 6.2, 6.3a, 6.3b). Plain ESM JS with no imports so the SAME source is inlined into n8n Code
// nodes (marker /*__INSIGHTS__*/) and used by unit tests and the fixture runner. Nothing here knows any industry,
// segment or offer: relevance always comes from the campaign (allowed categories, signal weights, opportunity map).

// ───────────────────────── text helpers ─────────────────────────
const INVISIBLE = new RegExp('[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]', 'g');
const DIACRITICS = new RegExp('[\u064B-\u065F\u0670\u0640]', 'g');

/** Lowercase, strip invisible/bidi marks and Arabic diacritics, unify alef/yaa/taa-marbuta, collapse spaces. */
export function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(INVISIBLE, '')
    .replace(DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Invisible/bidi marks removed, whitespace collapsed. */
export function stripInvisible(s) {
  return String(s ?? '').replace(INVISIBLE, '').replace(/\s+/g, ' ').trim();
}

/** Clean one location part for Apify: no invisible marks, no repeated words ("التجمع الخامس القاهرة القاهرة"). */
export function cleanPlace(s) {
  const t = String(s ?? '').replace(INVISIBLE, '').replace(/\s+/g, ' ').trim();
  const out = [];
  for (const w of t.split(' ')) if (!out.length || norm(out[out.length - 1]) !== norm(w)) out.push(w);
  return out.join(' ');
}

// ───────────────────────── global exclusions (spec 6.3a) ─────────────────────────
// Always on, for every campaign. Matched against Google Maps CATEGORIES (Arabic and English), never against the name alone.
// Hospitals only for health: clinics, labs and pharmacies are legitimate prospects for many offers.
export const GLOBAL_EXCLUSIONS = {
  government: ['مكتب حكومي', 'جهه حكوميه', 'هيئه حكوميه', 'مبني حكومي', 'وزاره', 'محافظه', 'مجلس مدينه', 'قسم شرطه', 'مركز شرطه', 'محكمه', 'نيابه', 'مصلحه', 'سجل مدني', 'government office', 'government organization', 'government agency', 'local government', 'city government', 'county government', 'municipality', 'ministry', 'police', 'courthouse', 'public administration'],
  utility: ['محطه كهرباء', 'محطه توليد', 'محطه مياه', 'محطه معالجه', 'محطه تحويل', 'محطه صرف', 'شركه كهرباء', 'شركه مياه', 'شركه غاز', 'سنترال', 'مرفق عام', 'power station', 'power plant', 'electric utility', 'electricity', 'water utility', 'water treatment', 'water works', 'sewage', 'telephone exchange', 'substation', 'gas utility', 'public utility'],
  education: ['جامعه', 'كليه', 'مدرسه', 'روضه اطفال', 'ثانويه', 'اعداديه', 'ابتدائيه', 'university', 'college', 'school', 'kindergarten', 'academy of', 'faculty'],
  health: ['مستشفي', 'hospital'],
  worship: ['مسجد', 'جامع', 'كنيسه', 'دير', 'معبد', 'مكان عباده', 'mosque', 'church', 'temple', 'synagogue', 'place of worship', 'cathedral', 'monastery'],
  embassy: ['سفاره', 'قنصليه', 'embassy', 'consulate'],
  military: ['موقع عسكري', 'قاعده عسكريه', 'معسكر', 'عسكري', 'military', 'army base', 'air force', 'naval'],
};

const hasEn = (p) => /^[a-z ]+$/.test(p);
const catMatches = (c, p) => (hasEn(p) ? new RegExp(`(^| )${p}( |$|s\\b)`).test(c) : c.includes(p));

/** @returns {{group:string, match:string, category:string}|null} */
export function globalExclusion(categories) {
  for (const raw of categories || []) {
    const c = norm(raw);
    if (!c) continue;
    for (const [group, pats] of Object.entries(GLOBAL_EXCLUSIONS)) {
      for (const p of pats) if (catMatches(c, norm(p))) return { group, match: p, category: String(raw) };
    }
  }
  return null;
}

/** Light stemmer so "وكالات" matches "وكالة" and "Agencies" matches "agency" (no dictionary, no segment knowledge). */
function stemToken(raw) {
  let t = norm(raw);
  if (/^[a-z0-9]+$/.test(t)) {
    if (t.length > 4 && t.endsWith('ies')) return t.slice(0, -3) + 'y';
    if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1);
    return t;
  }
  if (t.length > 4) t = t.replace(/^(وال|بال|لل|ال)/, '');
  if (t.length > 3) t = t.replace(/(ات|ون|ين|ان)$/, '');
  if (t.length > 3) t = t.replace(/ه$/, '');
  if (t.length > 3) t = t.replace(/ي$/, '');
  return t;
}
const catTokens = (s) => norm(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(stemToken);

/**
 * Does any Maps category match the campaign's allowed categories (Arabic and English)? Done by us, never by the actor.
 * Singular/plural and the Arabic article are ignored. An allowed entry matches a place category when all its words occur in the
 * category, or the category is a (parent) subset of the entry. An empty allow-list means "no category restriction" (old campaigns).
 * @returns {{ok:boolean, matched:string|null}}
 */
export function categoryMatch(placeCategories, allowed) {
  const list = (allowed || []).map((a) => ({ a, tokens: catTokens(a) })).filter((x) => x.tokens.length && norm(x.a).length >= 3);
  if (!list.length) return { ok: true, matched: null };
  for (const raw of placeCategories || []) {
    const c = catTokens(raw);
    if (!c.length) continue;
    const cs = new Set(c);
    for (const { a, tokens } of list) {
      const as = new Set(tokens);
      if (tokens.every((t) => cs.has(t))) return { ok: true, matched: a };
      if (c.every((t) => as.has(t)) && (c.length >= 2 || c[0].length >= 4)) return { ok: true, matched: a };
    }
  }
  return { ok: false, matched: null };
}

// ───────────────────────── deterministic facts (spec 6.3b step 1) ─────────────────────────
const DAY = 86400000;
const MONTH = 30.44 * DAY;
const r1 = (x) => Math.round(x * 10) / 10;

/**
 * @param {any} place raw Google Maps place (compass/crawler-google-places)
 * @param {any[]} reviews raw reviews for that place (compass/google-maps-reviews-scraper), newest first or any order
 * @param {{now?:number, branches?:number}} [opt]
 */
export function computeFacts(place, reviews = [], opt = {}) {
  const now = opt.now ?? Date.now();
  const seen = new Set();
  const rev = [];
  for (const r of reviews || []) {
    if (!r) continue;
    const id = r.reviewId || `${r.publishedAtDate}|${r.stars}|${r.text}`;
    if (seen.has(id)) continue;
    seen.add(id);
    rev.push(r);
  }
  const dates = rev.map((r) => Date.parse(r.publishedAtDate)).filter(Number.isFinite).sort((a, b) => a - b);
  const n = rev.length;
  const total = Number(place.reviewsCount) || n;
  const overall = Number(place.totalScore) || null;
  const last = dates.length ? dates[dates.length - 1] : null;
  const oldest = dates.length ? dates[0] : null;
  const sinceLast = last == null ? null : (now - last) / DAY;
  const activity_label = last == null ? 'unknown' : sinceLast <= 90 ? 'active' : sinceLast <= 365 ? 'slowing' : 'dormant';
  const spanMonths = oldest == null ? null : Math.max(0.25, (now - oldest) / MONTH);
  const replies = rev.filter((r) => r.responseFromOwnerText && String(r.responseFromOwnerText).trim()).length;
  const low = rev.filter((r) => Number(r.stars) <= 2);
  const stars = rev.map((r) => Number(r.stars)).filter(Number.isFinite);
  const recent_avg = stars.length ? stars.reduce((a, b) => a + b, 0) / stars.length : null;
  const texts = rev.filter((r) => (r.text || r.textTranslated || '').toString().trim());
  const images = Number(place.imagesCount) || 0;
  return {
    n_reviews_fetched: n,
    n_texts: texts.length,
    total_reviews: total,
    overall_rating: overall,
    last_review_at: last == null ? null : new Date(last).toISOString(),
    days_since_last_review: sinceLast == null ? null : Math.round(sinceLast),
    reviews_per_month: spanMonths == null || n < 2 ? null : r1(n / spanMonths),
    activity_label,
    // Only claim "new" when the fetched window provably covers the whole history and it started within a year.
    is_new_business: oldest != null && now - oldest <= 365 * DAY && total <= n ? true : null,
    owner_reply_rate: n ? Math.round((replies / n) * 100) / 100 : null,
    low_reviews: low.length,
    unanswered_low_reviews: low.filter((r) => !(r.responseFromOwnerText && String(r.responseFromOwnerText).trim())).length,
    recent_avg_rating: recent_avg == null ? null : r1(recent_avg),
    rating_delta: recent_avg == null || overall == null ? null : r1(recent_avg - overall),
    unclaimed_listing: place.claimThisBusiness === true,
    images_count: images,
    has_hours: Array.isArray(place.openingHours) && place.openingHours.length > 0,
    has_description: !!(place.description || place.ownerDescription || place.subTitle),
    // A Facebook/Instagram/link page used as the "website" is not a real website.
    has_website: !!(place.website && String(place.website).trim()) && !isSocialUrl(place.website),
    website_social: !!(place.website && isSocialUrl(place.website)),
    search_rank: Number.isFinite(Number(place.rank)) && Number(place.rank) > 0 ? Number(place.rank) : null,
    categories: [...new Set([place.categoryName, ...(Array.isArray(place.categories) ? place.categories : [])].filter(Boolean))].slice(0, 8),
    low_star_share: (() => { const d = place.reviewsDistribution; if (!d) return null; const t = ['oneStar', 'twoStar', 'threeStar', 'fourStar', 'fiveStar'].reduce((x, k) => x + (Number(d[k]) || 0), 0); return t ? Math.round((((Number(d.oneStar) || 0) + (Number(d.twoStar) || 0)) / t) * 100) / 100 : null; })(),
    permanently_closed: !!place.permanentlyClosed,
    temporarily_closed: !!place.temporarilyClosed,
    branches: opt.branches ?? 1,
  };
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const round3 = (v) => Math.round(clamp01(v) * 1000) / 1000;

/** Normalized signal values (0..1, 1 = the signal's HIGH state) from facts. Unknown stays absent (never guessed). */
export function signalValues(f) {
  const out = {};
  out.has_website = f.has_website ? 1 : 0;
  const rc = Math.min(1, Math.log10(1 + (f.total_reviews || 0)) / 3.3);
  const rt = clamp01(((f.overall_rating || 0) - 3) / 2);
  out.size_proxy = round3(0.6 * rc + 0.15 * rt + 0.25 * Math.min(1, ((f.branches || 1) - 1) / 3));
  out.unclaimed_listing = f.unclaimed_listing ? 1 : 0;
  out.profile_completeness = round3(0.7 * Math.min(1, (f.images_count || 0) / 15) + 0.3 * (f.has_hours ? 1 : 0));
  if (f.activity_label !== 'unknown') out.activity = f.activity_label === 'active' ? 1 : f.activity_label === 'slowing' ? 0.5 : 0;
  if (f.n_reviews_fetched >= 3) out.owner_engagement = round3(f.owner_reply_rate ?? 0);
  if (f.n_reviews_fetched >= 1) out.unanswered_low_reviews = round3((f.unanswered_low_reviews || 0) / 3);
  if (f.n_reviews_fetched >= 5 && f.rating_delta != null) out.rating_trend = round3(0.5 + Math.max(-0.5, Math.min(0.5, f.rating_delta / 1.0)));
  if (f.is_new_business === true) out.new_business = 1;
  return out;
}

/**
 * Value of the review_insights signal: how much of what customers complain about the seller's offer can help with (0..1).
 * Complaints the offer cannot help with count for nothing (spec 6.3b step 5). Undefined when there is no analysis.
 */
export function reviewInsightValue(analysis) {
  if (!analysis || analysis.skipped) return undefined;
  const rel = (analysis.complaints || []).filter((c) => c && c.offer_can_help);
  const n = rel.reduce((a, c) => a + (Number(c.count) || 1), 0);
  const top = rel.slice().sort((a, b) => (b.count || 0) - (a.count || 0))[0];
  return { value: Math.min(1, n / 3), theme: top ? top.theme : null };
}

// ───────────────────────── opportunities (spec 6.3b step 3) ─────────────────────────
// Generic insight types computed from facts. WHICH ones matter, and the angle sentence for each, comes from the
// campaign's opportunity_map (planner output for this offer). Nothing is tied to a segment.
export const OPPORTUNITY_TYPES = ['unclaimed_listing', 'no_website', 'thin_profile', 'unanswered_low_reviews', 'dormant_activity', 'declining_rating', 'low_owner_engagement', 'new_business', 'multi_branch', 'review_theme', 'weak_search_rank'];

function evalOpportunity(type, f, analysis) {
  switch (type) {
    case 'unclaimed_listing':
      return f.unclaimed_listing ? { strength: 2, evidence: { reviews: f.total_reviews } } : null;
    case 'no_website':
      return !f.has_website ? { strength: f.total_reviews >= 30 ? 3 : 2, evidence: { reviews: f.total_reviews, rating: f.overall_rating } } : null;
    case 'thin_profile':
      return f.images_count <= 5 || !f.has_hours ? { strength: f.images_count === 0 ? 3 : f.images_count <= 2 ? 2 : 1, evidence: { photos: f.images_count, hours: f.has_hours } } : null;
    case 'unanswered_low_reviews':
      return f.unanswered_low_reviews >= 1 ? { strength: Math.min(3, f.unanswered_low_reviews), evidence: { count: f.unanswered_low_reviews, of: f.n_reviews_fetched } } : null;
    case 'dormant_activity':
      return f.activity_label === 'dormant' ? { strength: 3, evidence: { days: f.days_since_last_review, last: f.last_review_at } }
        : f.activity_label === 'slowing' ? { strength: 1, evidence: { days: f.days_since_last_review, last: f.last_review_at } } : null;
    case 'declining_rating':
      return f.n_reviews_fetched >= 5 && f.rating_delta != null && f.rating_delta <= -0.3
        ? { strength: f.rating_delta <= -0.6 ? 3 : 2, evidence: { recent: f.recent_avg_rating, overall: f.overall_rating } } : null;
    case 'low_owner_engagement':
      return f.n_reviews_fetched >= 5 && f.owner_reply_rate != null && f.owner_reply_rate < 0.2
        ? { strength: f.owner_reply_rate === 0 && f.n_reviews_fetched >= 8 ? 3 : 2, evidence: { rate: f.owner_reply_rate, of: f.n_reviews_fetched } } : null;
    case 'new_business':
      return f.is_new_business === true ? { strength: 2, evidence: { reviews: f.total_reviews } } : null;
    case 'multi_branch':
      return f.branches >= 2 ? { strength: Math.min(3, f.branches), evidence: { branches: f.branches } } : null;
    case 'weak_search_rank':
      // Rank of the place inside the Maps result list of its search: the lower it appears, the less customers find it.
      return f.search_rank != null && f.search_rank >= 5 ? { strength: f.search_rank >= 10 ? 3 : f.search_rank >= 7 ? 2 : 1, evidence: { rank: f.search_rank } } : null;
    case 'review_theme': {
      // Complaint themes become an opportunity ONLY when the analysis says this offer can help, and confidence is not low.
      if (!analysis || analysis.confidence === 'low') return null;
      const hit = (analysis.complaints || []).filter((c) => c && c.offer_can_help).sort((a, b) => (b.count || 0) - (a.count || 0))[0];
      return hit ? { strength: Math.min(3, Math.max(1, hit.count || 1)), evidence: { theme: hit.theme, count: hit.count || 1 } } : null;
    }
    default:
      return null;
  }
}

/**
 * Top opportunities for one lead in one campaign.
 * @param {any} facts
 * @param {any} analysis review analysis (may be null)
 * @param {{type:string, angle:string}[]} oppMap campaign opportunity map, in the planner's priority order
 */
export function buildOpportunities(facts, analysis, oppMap, max = 3) {
  const out = [];
  (oppMap || []).forEach((m, idx) => {
    if (!m || !OPPORTUNITY_TYPES.includes(m.type)) return;
    const e = evalOpportunity(m.type, facts, analysis);
    if (e) out.push({ type: m.type, strength: e.strength, evidence: e.evidence, angle: String(m.angle || '').slice(0, 200), _p: idx });
  });
  out.sort((a, b) => b.strength - a.strength || a._p - b._p);
  return out.slice(0, max).map((o) => ({ type: o.type, strength: o.strength, evidence: o.evidence, angle: o.angle }));
}

// ───────────────────────── score (spec 6.3a) ─────────────────────────
// Mirrors public.recompute_campaign_scores in SQL (same constants). Signed weights: w>0 rewards the HIGH state, w<0 the LOW state.
export const SCORE = {
  favorable: 0.66, // a signal counts as "above zero" for the two-signal rule when its favorable state is this strong
  noBaseCap: 69, // fewer than two relevant non-baseline signals => score cannot exceed 69 (never "high" alone)
  maybeCap: 60,
  baselineMaxWeight: 25, // baseline facts (e.g. has a website) are clamped unless the planner marked the signal as emphasized
};

/**
 * @param {{fit?:'fit'|'maybe'|'not_fit'|null, signals:{key:string, weight:number, value:number, baseline?:boolean, emphasis?:boolean}[]}} x
 * @returns {{score:number|null, relevant:number, capped_by:string|null, favorable:{key:string, side:'high'|'low', contribution:number}[]}}
 */
export function scoreLead({ fit, signals }) {
  if (fit === 'not_fit') return { score: null, relevant: 0, capped_by: 'not_fit', favorable: [] };
  let sum = 0;
  let den = 0;
  let relevant = 0;
  const favorable = [];
  for (const s of signals) {
    let w = Number(s.weight);
    if (!w) continue;
    if (s.baseline && !s.emphasis) w = Math.sign(w) * Math.min(Math.abs(w), SCORE.baselineMaxWeight);
    const v = clamp01(Number(s.value));
    const c = w * v - Math.min(w, 0);
    sum += c;
    den += Math.abs(w);
    const fav = (w > 0 && v >= SCORE.favorable) || (w < 0 && v <= 1 - SCORE.favorable);
    if (fav) {
      favorable.push({ key: s.key, side: w > 0 ? 'high' : 'low', contribution: c });
      if (!s.baseline || s.emphasis) relevant++;
    }
  }
  if (!den) return { score: null, relevant, capped_by: null, favorable };
  let score = Math.round((100 * sum) / den);
  let capped_by = null;
  if (relevant < 2 && score > SCORE.noBaseCap) { score = SCORE.noBaseCap; capped_by = 'needs_two_signals'; }
  if (fit === 'maybe' && score > SCORE.maybeCap) { score = SCORE.maybeCap; capped_by = 'maybe_fit'; }
  favorable.sort((a, b) => b.contribution - a.contribution);
  return { score, relevant, capped_by, favorable };
}

// ───────────────────────── message tact (spec 6.3b step 5) ─────────────────────────
// Safety net on top of the prompt: the first message never mentions complaints, low ratings or any weakness of the lead.
const NEGATIVE_AR = ['شكوي', 'شكاوي', 'شكوه', 'شتك', 'مشكله', 'مشاكل', 'سيء', 'سيئ', 'وحش', 'ضعيف', 'ضعف', 'تاخير', 'متاخر', 'اهمال', 'مهمل', 'قصور', 'فشل', 'بطيء', 'بطئ', 'غير راضي', 'مش راضي', 'تقييم سيء', 'تقييم منخفض', 'تقييم قليل', 'تقييمات منخفضه', 'تقييمات سلبيه', 'سلبي', 'نجمه واحده', 'نجمتين', 'ريفيوهات وحشه', 'عيب', 'عيوب', 'نقطه ضعف', 'نقاط ضعف', 'مفيش رد', 'بدون رد', 'مرددتوش', 'ما ردتوش', 'مردتوش', 'مش بتردو', 'مبتردوش'];
const NEGATIVE_EN = ['complain', 'bad review', 'low rating', 'poor rating', 'negative', 'weakness', 'problem with', 'unanswered'];

// Unsupported first-person claims about the lead (the sender has not seen their work): hearsay, own opinions, visits.
const CLAIMS_AR = ['سمعت', 'سمعنا', 'عاجبني', 'عجبني', 'عاجبنا', 'عجبنا', 'شايف ان شغل', 'شايف انكم', 'متابع شغل', 'تابعت', 'زرت', 'جربت', 'اتعاملت معاكم', 'شغلكم رائع', 'شغلكم ممتاز', 'شغلكم حلو', 'شغلكم تحفه', 'بتعملوا شغل رائع', 'بتقدموا شغل حلو', 'من افضل'];

/** @returns {{ok:boolean, reasons:string[]}} */
export function checkTact(message, complaints = []) {
  const m = norm(message);
  const reasons = [];
  for (const w of NEGATIVE_AR.concat(NEGATIVE_EN)) if (m.includes(norm(w))) reasons.push(`word:${w}`);
  for (const w of CLAIMS_AR) if (m.includes(norm(w))) reasons.push(`claim:${w}`);
  // "your rating/reviews are low/bad" in any phrasing
  if (/(تقييم|ريفيو|نجوم|rating|review)\S*\s+(\S+\s+){0,2}(منخفض|قليل|ضعيف|سلبي|وحش|سيء|واطي|low|poor|bad)/.test(m)) reasons.push('rating_negative');
  for (const c of complaints || []) {
    const theme = typeof c === 'string' ? c : c && c.theme;
    for (const tok of norm(theme).split(' ')) if (tok.length >= 5 && m.includes(tok)) reasons.push(`theme:${tok}`);
  }
  return { ok: reasons.length === 0, reasons: [...new Set(reasons)] };
}


// ───────────────────────── message style rules (round 2) ─────────────────────────
// When the seller's product writes messages, the first message IS the demo: it must not read like a template. These are the
// checks that can be made in code; the prompt carries the rest. Nothing here depends on an industry or an offer.
const RATING_WORDS = ['تقييم', 'تقيم', 'نجمه', 'نجوم', 'ريفيو', 'rating', 'star', 'review'];
const JARGON_RE = /(^|[^a-z])(b2b|b2c|leads?|outreach|pipeline|crm|roi|kpi|funnel)([^a-z]|$)/i;
const JARGON_AR = ['بي تو بي', 'ليدز', 'ليد '];
const DAYTIME_AR = ['صباح', 'مساء'];
const WEAK_CTA = ['ممكن نتكلم', 'نتكلم اكتر', 'نتناقش', 'ممكن نتحدث', 'ممكن نتواصل', 'نتواصل معاكم'];
// Generic benefit phrases the writer likes to invent; allowed only if the seller's own offer text says so.
const BENEFIT_FLUFF = ['رضا العملاء', 'رضاهم', 'رضاكم', 'تعزيز التواصل', 'تقويه التواصل', 'يقوي التواصل', 'تحسين تجربه', 'يزود رضا', 'زياده رضا', 'جوده العمل', 'تركزوا علي شغلكم', 'تركز علي شغلها', 'تركزوا في شغلكم', 'شغلكم الاساسي', 'شغلها الاساسي', 'توفرو وقتكم', 'توفر وقتكم', 'تقلقوا', 'تقلق '];
// The sender has not seen their work: no own praise, and a first message promises no guarantee.
// Praise words are allowed only when the message attributes them to the customers ("عملاءكم بيشكروا في ..."); the sender's own praise is rejected.
const PRAISE_AR = ['مميز', 'ممتاز', 'رائع', 'شاطر', 'عظيم', 'متميز', 'تميز', 'احتراف', 'محترف', 'مختلف', 'متطور', 'ابداع', 'مبدع', 'خبره عاليه', 'باين عليكم', 'باين ان'];
const ATTRIBUTION = ['عملاءكم', 'عملاؤكم', 'عملائكم', 'بيشكروا', 'بيتكلموا', 'بيمدحوا', 'بيقولوا', 'بيحبوا'];
const ASSUMES = /((^| )(اكيد|واضح انكم|باين انكم)( |$))|((انتم|انكم|شغلكم|بيخليكم)( \S+){0,2} (محتاج|محتاجين|محتاجه)( |$))/;
const GUARANTEE_AR = ['نضمن', 'بنضمن', 'هنضمن', 'مضمون', 'ضمان', 'guarantee'];
const STOP = new Set(['من', 'في', 'علي', 'عن', 'الي', 'مع', 'ده', 'دي', 'كده', 'لو', 'او', 'ان', 'انت', 'انتم', 'احنا', 'هو', 'هي']);

const wordList = (s) => String(s || '').trim().split(/\s+/).filter(Boolean);
const contentTokens = (s) => catTokens(s).filter((t) => t.length >= 2 && !STOP.has(t));

/** First five words of a message (normalized): two messages of one campaign must not share them. */
export function openingKey(message) {
  return norm(message).replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean).slice(0, 5).join(' ');
}

/** Word-set overlap (Jaccard, 0..1) of two messages: two messages of one campaign above SIMILAR_LIMIT read like the same template. */
export const SIMILAR_LIMIT = 0.6;
export function messageSimilarity(a, b) {
  const t = (s) => new Set(norm(s).replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter((w) => w.length > 2));
  const x = t(a);
  const y = t(b);
  const inter = [...x].filter((w) => y.has(w)).length;
  const uni = new Set([...x, ...y]).size;
  return uni ? inter / uni : 0;
}

/** Does the quoted phrase come from the seller's offer text? Exact (normalized) match, or at least 85% of its words, for 3+ words. */
export function quoteInOffer(quote, offerText) {
  const q = norm(quote).replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
  const o = norm(offerText).replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (q.split(' ').length < 3 || !o) return false;
  if (o.includes(q)) return true;
  const have = new Set(catTokens(o));
  const qt = catTokens(q);
  return qt.length >= 3 && qt.filter((t) => have.has(t)).length / qt.length >= 0.85;
}

/**
 * Style and honesty checks on one first message.
 * @param {string} message
 * @param {{channel?:string, areas?:string[], city?:string|null, offerText?:string, offerQuote?:string|null, ctaOffer?:string|null, senderName?:string|null}} ctx
 * @returns {{ok:boolean, reasons:string[]}}
 */
export function checkMessage(message, ctx = {}) {
  const m = norm(message);
  const reasons = [];
  const chat = ctx.channel !== 'email';
  const n = wordList(message).length;
  if (chat && (n < 35 || n > 70)) reasons.push(`word_count_${n}`);
  for (const w of RATING_WORDS) if (m.includes(norm(w))) { reasons.push('mentions_rating'); break; }
  if (/[⭐★☆]/.test(message)) reasons.push('mentions_rating');
  if (JARGON_RE.test(m) || JARGON_AR.some((w) => m.includes(norm(w)))) reasons.push('jargon');
  if (DAYTIME_AR.some((w) => new RegExp(`(^| )${norm(w)}`).test(m)) || /good (morning|evening|afternoon)/.test(m)) reasons.push('time_greeting');
  // micro-districts: the lead's own district / neighborhood names are never used; the city (at most) is fine
  const city = norm(ctx.city || '');
  for (const a of ctx.areas || []) {
    const t = norm(a);
    if (t.length >= 3 && t !== city && !(city && city.includes(t)) && m.includes(t)) { reasons.push(`micro_district:${a}`); break; }
  }
  if (/(المنطقه|الحي|حي) (ال)?(اولي|ثانيه|ثالثه|رابعه|خامسه|سادسه|سابعه|ثامنه|تاسعه|عاشره|اول|ثاني|ثالث|رابع|خامس|سادس|سابع|ثامن|تاسع|عاشر)/.test(m)) reasons.push('micro_district:ordinal');
  if (WEAK_CTA.some((w) => m.includes(norm(w)))) reasons.push('weak_cta');
  {
    const ws = m.split(/\s+/);
    const own = ws.some((w, i) => PRAISE_AR.some((p) => w.includes(norm(p))) && !ws.slice(Math.max(0, i - 7), i).some((b) => ATTRIBUTION.some((a) => b.includes(norm(a)))));
    if (own) reasons.push('own_praise');
    if (ASSUMES.test(m)) reasons.push('assumes_need');
  }
  if (GUARANTEE_AR.some((w) => m.includes(norm(w)))) reasons.push('guarantee');
  const offerN = norm(ctx.offerText || '');
  for (const f of BENEFIT_FLUFF) if (m.includes(norm(f)) && !offerN.includes(norm(f))) { reasons.push(`invented_benefit:${f}`); break; }
  if (ctx.offerText) {
    if (!ctx.offerQuote) reasons.push('offer_quote_missing');
    else if (!quoteInOffer(ctx.offerQuote, ctx.offerText)) reasons.push('offer_quote_not_in_offer');
  }
  if (ctx.ctaOffer) {
    const have = new Set(contentTokens(message));
    const hit = contentTokens(ctx.ctaOffer).filter((t) => have.has(t)).length;
    if (hit < 2) reasons.push('cta_offer_missing');
  }
  if (ctx.senderName && chat) {
    const tail = m.slice(-60);
    if (!tail.includes(norm(ctx.senderName))) reasons.push('missing_signature');
  }
  return { ok: reasons.length === 0, reasons: [...new Set(reasons)] };
}

/** The single automatic retry of a rejected first message: same request plus the rejected reply and the reason as feedback. */
export function retryRequestBody(requestBody, raw, reason) {
  const req = JSON.parse(requestBody);
  req.messages = [...req.messages, { role: 'assistant', content: raw || '{}' }, { role: 'user', content: `Your reply was rejected (${reason}). Rewrite it and return the JSON again. Remember: 35 to 70 words, no rating or stars or reviews, no district or neighborhood names, no jargon (no B2B), no time-of-day greeting, no "ممكن نتكلم", no praise of their work, no guarantees, no "focus on your core work" lines, address them as a team in the plural, end with the concrete offer (cta_offer) worded differently from the usual and the signature, offer_quote must be copied word for word from sender_offer, never invent benefits, never mention complaints or weaknesses, start differently from avoid_openings and use different sentences from the other messages of this campaign.` }];
  const wc = /word_count_(\d+)/.exec(String(reason));
  if (wc) req.messages[req.messages.length - 1].content += ` The text had ${wc[1]} words. Write between 45 and 60 words: ${Number(wc[1]) < 35 ? 'add one more concrete sentence about what the offer does (use the wording of offer_quote)' : 'cut the weakest sentence'}.`;
  req.temperature = 0.5;
  return JSON.stringify(req);
}

// ───────────────────────── LLM helpers (OpenRouter request/response) ─────────────────────────
/** OpenRouter chat request body (string). `fallback` = fallback model ids tried on provider failure. */
export function llmRequest({ system, user, model, fallback = [], temperature = 0, extraMessages = [] }) {
  const req = {
    messages: [{ role: 'system', content: system }, { role: 'user', content: typeof user === 'string' ? user : JSON.stringify(user) }, ...extraMessages],
    response_format: { type: 'json_object' },
    temperature,
    usage: { include: true },
  };
  const fb = (fallback || []).filter(Boolean);
  if (fb.length) req.models = [model, ...fb]; else req.model = model;
  return JSON.stringify(req);
}

/** Parse an OpenRouter full-response item. @returns {{data:any|null, usage:{in:number,out:number,cost:number,model:string|null}, status:number|null}} */
export function parseLlm(res) {
  const r = res || {};
  const u = (r.body && r.body.usage) || {};
  const usage = { in: u.prompt_tokens || 0, out: u.completion_tokens || 0, cost: Number(u.cost) || 0, model: (r.body && r.body.model) || null };
  let data = null;
  if (r.statusCode >= 200 && r.statusCode < 300 && r.body && r.body.choices) {
    try { data = JSON.parse((r.body.choices[0]?.message?.content || '').replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()); } catch { data = null; }
  }
  return { data, usage, status: typeof r.statusCode === 'number' ? r.statusCode : null };
}

/** System prompt of the fit check (spec 6.0 step 3 and 4). Offer-agnostic: the ideal prospect text is the only criterion. */
export function fitSystemPrompt({ ideal, offerText, negatives = [] }) {
  return `You judge whether Google Maps places are potential CUSTOMERS (prospects) for a seller.
Ideal prospect: ${ideal || '(not stated; judge from the seller offer)'}
Seller offer: ${String(offerText || '').slice(0, 500)}
For each place decide: "fit" (clearly the kind of business described), "maybe" (possibly, adjacent or unclear), "not_fit" (a different kind of business even if its NAME contains similar words, a public or government body, a competitor of the seller, or unrelated).
EVIDENCE RULES:
- Judge ONLY from the place's categories, its description and its website address. The business NAME is context only: words inside a name (including words that also appear in the ideal prospect text or the seller offer) are NOT evidence of what the business does or sells.
- When a word naming an industry, a product or a customer group sits next to the word that names the kind of business (in the name or in a category), it says what the business SELLS or serves, so the business belongs to THAT sector: answer "not_fit" (not "maybe"), unless the ideal prospect text itself asks for that sector.
- Return "evidence": the source that supports your label, one of "category", "description", "website", "name_only" (nothing but the name supports it) or "none". Use "fit" only when the evidence is category, description or website.
Give a SHORT reason (max 12 words, in the same language as the ideal prospect text).${negatives.length ? `\nThe seller already rejected businesses like these (treat similar ones as not_fit):\n${negatives.slice(0, 15).map((n) => `- ${n.business_name || ''} (${n.category || ''}): ${n.reason || ''}`).join('\n')}` : ''}
Return ONE JSON object only: {"results":[{"i": number, "fit": "fit"|"maybe"|"not_fit", "evidence": "category"|"description"|"website"|"name_only"|"none", "reason": string}]} covering every i.`;
}

const hostOf = (u) => { try { return new URL(/^[a-z]+:\/\//i.test(u) ? u : `https://${u}`).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };

/** Social and messaging pages people use instead of a website. A business that only has one of these has no real website. */
const SOCIAL_HOSTS = ['facebook.com', 'fb.com', 'fb.me', 'instagram.com', 'linktr.ee', 'beacons.ai', 'tiktok.com', 'twitter.com', 'x.com', 'linkedin.com', 'wa.me', 'whatsapp.com', 'youtube.com', 'youtu.be', 't.me', 'behance.net'];
export function isSocialUrl(u) {
  const h = hostOf(String(u || ''));
  return !!h && SOCIAL_HOSTS.some((s) => h === s || h.endsWith(`.${s}`));
}

/** The compact description of one place sent to the fit check: categories, description and website address are evidence; the name is context. */
export function fitAsk(rawPlace, area) {
  const cats = [rawPlace.categoryName, ...(Array.isArray(rawPlace.categories) ? rawPlace.categories : [])].filter(Boolean);
  const desc = stripInvisible(rawPlace.description || rawPlace.ownerDescription || rawPlace.subTitle || '').slice(0, 240);
  return {
    name: stripInvisible(rawPlace.title), categories: [...new Set(cats)].slice(0, 8), description: desc || null,
    website: rawPlace.website ? hostOf(String(rawPlace.website)) || 'yes' : 'no', area: area || '', rating: rawPlace.totalScore ?? null, reviews: rawPlace.reviewsCount ?? null,
  };
}

/**
 * Keep or remove one place after the fit check (spec 6.0 step 4, round 2 fixes).
 * Inside the allowed categories: fit or maybe is kept (the category itself is evidence), not_fit removed.
 * Outside them: kept ONLY when the check said "fit" with evidence from the categories, description or website; never from the name,
 * never for "maybe". Nothing is learned from the model: a category joins the allowed list only through a user action.
 * @returns {{keep:boolean, fit?:'fit'|'maybe', why?:string}}
 */
export function decideFit({ label, inside }) {
  const l = label || { fit: 'maybe', reason: 'unchecked' };
  if (l.fit === 'not_fit') return { keep: false, why: 'not_fit' };
  const ev = l.evidence;
  const real = ev === 'category' || ev === 'description' || ev === 'website';
  if (inside) return { keep: true, fit: l.fit === 'fit' && ev !== 'name_only' ? 'fit' : 'maybe' };
  if (l.fit === 'fit' && real) return { keep: true, fit: 'fit' };
  return { keep: false, why: l.fit === 'fit' ? 'name_only_evidence' : 'outside_categories' };
}

// ───────────────────────── search rounds (spec 6.2) ─────────────────────────
/** Search area of a location: the most specific name and a clean geocoder string (no repeated parts, no hidden characters). */
export function areaOf(l) {
  // Unique parts; a part already contained in a more specific one is dropped ("القاهرة" inside "التجمع الخامس القاهرة").
  const parts = [cleanPlace(l.district), cleanPlace(l.city), cleanPlace(l.governorate)].filter(Boolean);
  const kept = parts.filter((p, i) => !parts.some((q, j) => j !== i && norm(q) !== norm(p) && norm(q).includes(norm(p))) && parts.findIndex((q) => norm(q) === norm(p)) === i);
  return { area: cleanPlace(l.district || l.city || l.governorate || ''), locationQuery: kept.concat('Egypt').join(', ') };
}

/**
 * Plan the Apify searches for a round. Rounds: 1 base queries at real depth; 2 same queries deeper (only the ones that hit
 * their cap); 3 synonyms; 4 nearby districts; 5 broad fallback (city level, simplest keyword) used for zero results.
 * @returns {{round:number, searches:{query:string, area:string, locationQuery:string, depth:number}[]}|null} null = exhausted
 */
export function planRound({ round, target, keywords, synonyms = [], locations, nearby = [], done = [], saturated = [], avoid = [], minDepth = 20, maxDepth = 120 }) {
  const doneSet = new Set(done.map((d) => norm(d)));
  const loc = areaOf;
  const mk = (kws, locs, depthMul = 1) => {
    const base = Math.min(maxDepth, Math.max(minDepth, Math.ceil((target * 2.5) / Math.max(1, kws.length * locs.length))));
    const depth = Math.min(maxDepth, Math.ceil(base * depthMul));
    const s = [];
    for (const l of locs) {
      const { area, locationQuery } = loc(l);
      for (const k of kws) {
        const query = `${cleanPlace(k)} ${area}`.trim();
        s.push({ query, area, locationQuery, depth, key: norm(`${depthMul}|${query}`) });
      }
    }
    return s;
  };
  let searches = [];
  if (round === 1) searches = mk(keywords, locations);
  else if (round === 2) {
    const sat = new Set(saturated.map(norm));
    searches = mk(keywords, locations, 2.5).filter((s) => sat.has(norm(s.query)));
  } else if (round === 3) searches = mk(synonyms, locations);
  else if (round === 4) searches = mk(keywords.concat(synonyms).slice(0, 4), nearby);
  else if (round === 5) {
    // Broad fallback: simplest keyword, city level (or governorate), no district polygon.
    const broad = locations.map((l) => ({ governorate: l.governorate, city: l.city || l.governorate, district: '' }));
    searches = mk(keywords.slice(0, 2), broad.length ? broad : locations);
  } else return null;
  // `avoid` = searches this organization already ran in earlier campaigns: the same companies would come back, so prefer new ones.
  const avoidSet = new Set(avoid.map(norm));
  searches = searches.filter((s) => s.query && !doneSet.has(norm(s.query) + '|' + round) && !avoidSet.has(norm(s.query)));
  return searches.length ? { round, searches } : null;
}

/**
 * After a round: which round next (null = stop). Normal order 1..5; if round 1 found no places at all the engine jumps to the
 * broad fallback first (city level, simplest keywords), then synonyms and nearby districts.
 * @returns {{next:number|null, mode:'normal'|'zero'}}
 */
export function decideNext({ round, mode = 'normal', delivered, target, rawTotal }) {
  if (delivered >= target) return { next: null, mode };
  if (round === 1 && rawTotal === 0) return { next: 5, mode: 'zero' };
  if (mode === 'zero') return { next: round === 5 ? 3 : round === 3 ? 4 : null, mode };
  return { next: round < 5 ? round + 1 : null, mode };
}

/** Why a campaign delivered nothing (plain code, mapped to a user message with concrete suggestions in the UI). */
export function emptyReason(f) {
  if (!f.raw_places) return 'no_places';
  if (f.removed_not_fit >= (f.raw_places - f.removed_category - f.removed_global - f.removed_closed) && f.removed_not_fit > 0) return 'all_not_fit';
  if (f.removed_category + f.removed_global >= f.raw_places * 0.8) return 'all_category';
  if (f.previously_found > 0 && f.previously_found >= f.raw_places * 0.5) return 'all_previously_found';
  if (f.cooldown > 0 && f.cooldown >= f.raw_places * 0.5) return 'all_cooldown';
  return 'all_filtered';
}

/** Funnel keys shown on the campaign page, in order (spec 6.2). */
export const FUNNEL_KEYS = ['queries', 'raw_places', 'removed_category', 'removed_global', 'removed_closed', 'removed_landline', 'removed_filters', 'removed_not_fit', 'duplicates', 'previously_found', 'opted_out', 'cooldown', 'delivered'];
