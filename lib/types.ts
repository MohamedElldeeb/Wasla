// Hand-written row types for the tables the UI reads (the generated Supabase types are large; regenerate with the MCP if needed).
export type OfferProfile = {
  what_we_sell?: string;
  ideal_customer?: string;
  problems_we_solve?: string;
  proof_points?: string;
  regions?: { governorate?: string; city?: string; district?: string }[];
};

export type CampaignSignal = { key: string; weight: number };

export type CampaignParameters = {
  keywords?: string[];
  locations?: { governorate?: string; city?: string; district?: string }[];
  max_results?: number;
  filters?: {
    min_rating?: number;
    min_reviews?: number;
    must_have_phone?: boolean;
    must_have_mobile?: boolean;
    must_have_website?: boolean;
    exclude_closed?: boolean;
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
  type: 'ingest' | 'enrich' | 'generate' | 'email_send' | 'plan' | 'signals';
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  progress: number;
  counts: Record<string, number | string | null | Record<string, number>>;
  error: string | null;
  result: PlannerDraft | null;
  credits_reserved: number;
  credits_used: number;
  created_at: string;
};

export type PlannerDraft = {
  categories: string[];
  keywords: string[];
  locations: { governorate: string; city: string; district: string }[];
  signals: { key: string; weight: number; reason_ar: string }[];
  angles: { title_ar: string; description_ar: string }[];
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
  review_status: 'pending' | 'approved' | 'rejected' | 'sent';
  regen_count: number;
  sent_at: string | null;
  leads: Lead;
};
