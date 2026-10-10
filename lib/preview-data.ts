// Sample data for /preview (marketing screenshots of the real components). The business is fictional; the funnel numbers come from the Alexandria fixture run.
import type { CampaignLead, Job, LeadInsight } from '@/lib/types';

export const PREVIEW_ITEM: CampaignLead = {
  id: 'preview-cl',
  opportunity_score: 74,
  score_reasons: [],
  score_reason_keys: [],
  fit: 'fit',
  fit_reason: null,
  selected_opportunity: 'low_owner_engagement',
  opportunities: [
    { type: 'low_owner_engagement', strength: 3, evidence: { rate: 0.1, of: 10 }, angle: '' },
    { type: 'declining_rating', strength: 2, evidence: { recent: 3.4, overall: 4.1 }, angle: '' },
  ],
  leads: {
    id: 'preview-l', business_name: 'Nabd Marketing', category: 'Marketing agency', district: 'Sidi Gaber', city: 'Alexandria',
    phone_e164: '+201001234567', phone_type: 'mobile', whatsapp_eligible: true, website: 'https://example.com', rating: 4.1, reviews_count: 38,
    google_maps_url: null, status: 'new',
  },
};

export const PREVIEW_INSIGHT: LeadInsight = {
  lead_id: 'preview-l',
  facts: {
    n_reviews_fetched: 10, n_texts: 8, total_reviews: 38, overall_rating: 4.1, last_review_at: '2026-08-02T10:00:00Z', days_since_last_review: 69,
    reviews_per_month: 1.4, activity_label: 'active', is_new_business: null, owner_reply_rate: 0.1, low_reviews: 3, unanswered_low_reviews: 3,
    recent_avg_rating: 3.4, rating_delta: -0.7, unclaimed_listing: false, images_count: 41, has_hours: true, has_website: true, branches: 1,
  },
  analysis: {
    praised: [{ theme: 'creative ideas', count: 4 }, { theme: 'professional team', count: 3 }],
    complaints: [],
    summary_ar: 'يثني العملاء على الأفكار الإبداعية والفريق المحترف، مع تأخر بسيط في التسليم ذكرته مراجعة واحدة.',
    summary_en: 'Customers praise the creative ideas and the professional team; one review mentions a small delay in delivery.',
    confidence: 'medium', n_texts: 8,
  },
};

export const PREVIEW_MESSAGE = {
  ar: 'أهلاً، شفت شغلكم في نبض للتسويق وأفكاركم الإبداعية لفتت نظري. إحنا في وصلة بنساعد الوكالات تلاقي عملاء B2B مناسبين وتبعتلهم رسايل واتساب شخصية. تحبوا أوريكم إزاي ده ممكن يشتغل معاكم؟',
  en: 'Hi, I saw the work at Nabd Marketing and the creative ideas stood out. At Wasla we help agencies find fitting B2B clients and send them personal WhatsApp messages. Would you like to see how that could work for you?',
};

export const PREVIEW_JOB: Job = {
  id: 'preview-job', organization_id: 'o', campaign_id: 'c', type: 'ingest', status: 'succeeded', progress: 100, error: null, result: null,
  credits_reserved: 15, credits_used: 11, created_at: '2026-10-10T10:00:00Z',
  counts: {
    lead_cap: 15, delivered: 11, round: 1,
    funnel: { queries: 4, raw_places: 24, removed_closed: 0, removed_global: 4, removed_global_by: { education: 3, government: 1 }, removed_category: 0, removed_landline: 0, removed_filters: 0, removed_not_fit: 7, duplicates: 0, previously_found: 0, opted_out: 0, cooldown: 0, delivered: 11 },
  },
};

export const PREVIEW_AR = {
  lead: { business_name: 'نبض للتسويق', category: 'وكالة تسويق', district: 'سيدي جابر', city: 'الإسكندرية' },
  praised: [{ theme: 'أفكار إبداعية', count: 4 }, { theme: 'فريق محترف', count: 3 }],
};
