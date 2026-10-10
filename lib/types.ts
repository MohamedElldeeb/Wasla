// Hand-written row types for the tables the UI reads (the generated Supabase types are large; regenerate with the MCP if needed).
export type OfferProfile = {
  what_we_sell?: string;
  ideal_customer?: string;
  problems_we_solve?: string;
  proof_points?: string;
  regions?: { governorate?: string; city?: string; district?: string }[];
  example_customers?: string[];
  /** One concrete, low-friction offer the first message ends with (e.g. a free sample). Optional. */
  cta_offer?: string;
  /** Optional messages this organization likes; the writer copies only their tone, length and shape. Empty by default. */
  style_examples?: string[];
  /** First name used to sign the first message ("name from company"). Optional. */
  sender_name?: string;
};

export type CampaignSignal = { key: string; weight: number; emphasis?: boolean };
export type Region3 = { governorate?: string; city?: string; district?: string };
/** Planner output: an opportunity type this offer can help with, and the one-sentence angle for it. */
export type OpportunityMapItem = { type: string; angle_ar: string; why_it_means_they_need_the_offer?: string };

export type CampaignParameters = {
  keywords?: string[];
  locations?: Region3[];
  max_results?: number;
  /** Fresh leads across campaigns (spec 6.2): false by default; true also searches companies found in earlier campaigns. */
  include_previous_companies?: boolean;
  learned_categories?: string[];
  /** One sentence describing the ideal prospect. Used by the probe and by the fit check on every delivered lead. */
  ideal_lead_description?: string;
  synonyms?: string[];
  nearby_locations?: Region3[];
  opportunities?: OpportunityMapItem[];
  complaint_relevance?: string | null;
  filters?: {
    min_rating?: number;
    min_reviews?: number;
    must_have_phone?: boolean;
    must_have_mobile?: boolean;
    must_have_website?: boolean;
    exclude_closed?: boolean;
    /** Allowed Google Maps categories, Arabic and English. Matched by Wasla, never by the actor. */
    categories_include?: string[];
    categories_exclude?: string[];
  };
  enrich_emails?: boolean;
  channel?: 'whatsapp' | 'messenger' | 'email';
  tone?: 'friendly' | 'professional' | 'direct';
  offer_override?: string;
  llm_model_override?: string;
  signals?: CampaignSignal[];
  angle?: { title_ar: string; description_ar: string } | null;
};

export type Campaign = {
  id: string;
  organization_id: string;
  name: string;
  source: string;
  parameters: CampaignParameters;
  status: 'draft' | 'running' | 'ready' | 'archived';
  created_at: string;
};

export type Job = {
  id: string;
  organization_id: string;
  campaign_id: string | null;
  type: 'ingest' | 'enrich' | 'generate' | 'email_send' | 'plan' | 'signals' | 'probe' | 'interview';
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  progress: number;
  counts: JobCounts;
  error: string | null;
  result: unknown;
  credits_reserved: number;
  credits_used: number;
  created_at: string;
};

export type PlannerDraft = {
  categories: string[];
  keywords: string[];
  ideal_lead_description?: string;
  synonyms?: string[];
  locations: { governorate: string; city: string; district: string }[];
  nearby_locations?: { governorate: string; city: string; district: string }[];
  signals: { key: string; weight: number; reason_ar: string; emphasis?: boolean }[];
  opportunities?: OpportunityMapItem[];
  complaint_relevance?: string | null;
  angles: { title_ar: string; description_ar: string }[];
};

/** Funnel of one campaign (spec 6.2): every removal reason with its count, so fewer leads than requested is explained. */
export type Funnel = {
  queries: number;
  raw_places: number;
  removed_closed: number;
  removed_global: number;
  removed_global_by?: Record<string, number>;
  removed_category: number;
  removed_landline: number;
  removed_filters: number;
  removed_not_fit: number;
  duplicates: number;
  previously_found: number;
  opted_out: number;
  cooldown: number;
  delivered: number;
};

export type JobCounts = {
  found?: number; new?: number; already_known?: number; filtered_out?: number; delivered?: number; lead_cap?: number; round?: number;
  funnel?: Funnel; reached_target?: boolean; empty_reason?: string | null; short_reason?: string | null;
  not_fit_examples?: { name: string; reason: string }[]; fit_unchecked?: number;
  generated?: number; failed?: number; retried?: number; skipped_cooldown?: number;
  [k: string]: unknown;
};

/** Deterministic facts about a lead (computed in code, spec 6.3b step 1). */
export type LeadFacts = {
  n_reviews_fetched: number; n_texts: number; total_reviews: number; overall_rating: number | null;
  last_review_at: string | null; days_since_last_review: number | null; reviews_per_month: number | null;
  activity_label: 'active' | 'slowing' | 'dormant' | 'unknown'; is_new_business: boolean | null;
  owner_reply_rate: number | null; low_reviews: number; unanswered_low_reviews: number;
  recent_avg_rating: number | null; rating_delta: number | null; unclaimed_listing: boolean;
  images_count: number; has_hours: boolean; has_website: boolean; branches: number;
  website_social?: boolean; search_rank?: number | null; categories?: string[]; low_star_share?: number | null;
};

export type ReviewAnalysis = {
  praised?: { theme: string; count: number }[];
  complaints?: { theme: string; count: number; offer_can_help?: boolean }[];
  customer_values?: string; summary_ar?: string; summary_en?: string;
  confidence?: 'low' | 'medium' | 'high'; skipped?: string; n_texts?: number;
};

export type LeadInsight = { lead_id: string; facts: LeadFacts; analysis: ReviewAnalysis | null };

export type Opportunity = { type: string; strength: number; evidence: Record<string, number | string | boolean | null>; angle: string };

export type ProbeResult = {
  places: { name: string; category: string | null; area: string; fit: 'fit' | 'maybe' | 'not_fit'; reason: string }[];
  fit_share: number; judged: number; fit: number; raw_places: number; rewritten: boolean; queries: string[] | null; suggested_categories?: string[];
  removed?: { closed: number; global: number; category: number };
};

export type InterviewTurn = {
  reply: string; quick_replies: string[]; done: boolean; asked: number;
  profile: null | { what_we_sell: string; ideal_customer: string; problems_we_solve: string; proof_points: string; regions: { governorate: string; city: string }[]; example_customers: string[]; cta_offer?: string; sender_name?: string };
};

export type SignalDefinition = {
  key: string;
  name_ar: string;
  description_ar: string | null;
  credit_cost: number;
  cost_group: string | null;
  reason_low_ar: string | null;
  reason_high_ar: string | null;
  enabled: boolean;
  phase: number;
};

export type Lead = {
  id: string;
  business_name: string | null;
  category: string | null;
  district: string | null;
  city: string | null;
  phone_e164: string | null;
  phone_type: 'mobile' | 'landline' | 'unknown';
  whatsapp_eligible: boolean;
  website: string | null;
  rating: number | null;
  reviews_count: number | null;
  google_maps_url: string | null;
  status: string;
};

export type CampaignLead = {
  id: string;
  opportunity_score: number | null;
  score_reasons: string[];
  score_reason_keys: { k: string; s: 'high' | 'low'; label?: string }[];
  fit?: 'fit' | 'maybe';
  fit_reason?: string | null;
  opportunities?: Opportunity[];
  selected_opportunity?: string | null;
  leads: Lead;
};

export type Message = {
  id: string;
  lead_id: string;
  campaign_id: string;
  channel: 'whatsapp' | 'messenger' | 'email';
  generated_text: string;
  edited_text: string | null;
  angle: string | null;
  opportunity_type?: string | null;
  review_status: 'pending' | 'approved' | 'rejected' | 'sent' | 'failed';
  fail_reason?: string | null;
  regen_count: number;
  sent_at: string | null;
  leads: Lead;
};
