-- Spec v2.1: offer profile shape, signal library, lead_signals, per-campaign score columns,
-- planner/signal job types, jobs.result, templates with signals.

-- Offer profile fields live in organizations.offer_profile (jsonb). Enforce the shape, not the content:
--   what_we_sell, ideal_customer, problems_we_solve, proof_points : text
--   regions : array of {governorate, city?} objects or strings
alter table public.organizations add constraint organizations_offer_profile_shape check (
  jsonb_typeof(offer_profile) = 'object'
  and (not (offer_profile ? 'what_we_sell')       or jsonb_typeof(offer_profile -> 'what_we_sell') = 'string')
  and (not (offer_profile ? 'ideal_customer')     or jsonb_typeof(offer_profile -> 'ideal_customer') = 'string')
  and (not (offer_profile ? 'problems_we_solve')  or jsonb_typeof(offer_profile -> 'problems_we_solve') = 'string')
  and (not (offer_profile ? 'proof_points')       or jsonb_typeof(offer_profile -> 'proof_points') = 'string')
  and (not (offer_profile ? 'regions')            or jsonb_typeof(offer_profile -> 'regions') = 'array')
);

-- Jobs: planner and signal types, plus a structured result (e.g. the planner draft).
alter table public.jobs drop constraint jobs_type_check;
alter table public.jobs add constraint jobs_type_check
  check (type in ('ingest', 'enrich', 'generate', 'email_send', 'plan', 'signals'));
alter table public.jobs add column result jsonb;

-- Signal library (global config as data). Weights live on campaigns, never here.
create table public.signal_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name_ar text not null,
  description_ar text,
  source text not null,
  phase integer not null,
  credit_cost integer not null default 0 check (credit_cost >= 0), -- PROPOSED
  cost_group text,            -- signals sharing a group are collected by one actor run and charged once
  reason_low_ar text,         -- short Arabic reason when the normalized value is low (<= 0.34)
  reason_high_ar text,        -- short Arabic reason when the normalized value is high (>= 0.66)
  enabled boolean not null default true, -- false until the collector exists (Phase 3 signals)
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger signal_definitions_updated_at before update on public.signal_definitions
  for each row execute function public.set_updated_at();

-- Collected signal values per lead. normalized = {"value": 0..1, "label_ar": optional custom high-side reason}.
create table public.lead_signals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  signal_key text not null references public.signal_definitions (key),
  raw jsonb,
  normalized jsonb not null check (
    jsonb_typeof(normalized) = 'object'
    and jsonb_typeof(normalized -> 'value') = 'number'
    and (normalized ->> 'value')::numeric between 0 and 1),
  source text not null,
  job_id uuid references public.jobs (id) on delete set null,
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, signal_key)
);
create index lead_signals_org_idx on public.lead_signals (organization_id);
create index lead_signals_job_idx on public.lead_signals (job_id);
create index lead_signals_signal_key_idx on public.lead_signals (signal_key);
create trigger lead_signals_updated_at before update on public.lead_signals
  for each row execute function public.set_updated_at();

-- Score is per campaign (weights are per campaign).
alter table public.campaign_leads
  add column opportunity_score smallint check (opportunity_score between 0 and 100),
  add column score_reasons jsonb not null default '[]'::jsonb check (jsonb_typeof(score_reasons) = 'array'),
  add column scored_at timestamptz;
create index campaign_leads_score_idx on public.campaign_leads (campaign_id, opportunity_score desc nulls last);

-- RLS: members read; writes are service-role only (collectors and scoring).
alter table public.signal_definitions enable row level security;
alter table public.lead_signals enable row level security;
revoke all on public.signal_definitions, public.lead_signals from anon, authenticated;
grant select on public.signal_definitions, public.lead_signals to authenticated;
create policy signal_definitions_select on public.signal_definitions for select to authenticated using (true);
create policy lead_signals_select on public.lead_signals for select to authenticated
  using (public.is_org_member(organization_id));

-- Seed the library (PROPOSED costs; Phase 3 collectors are disabled until built).
insert into public.signal_definitions
  (key, name_ar, description_ar, source, phase, credit_cost, cost_group, reason_low_ar, reason_high_ar, enabled, sort_order) values
  ('review_insights', 'مضمون الريفيوهات', 'ملخص المدح والشكاوى المتكررة من آخر ١٠ ريفيوهات', 'compass/google-maps-reviews-scraper + LLM', 2, 1, 'reviews',
     'الريفيوهات كلها مدح', 'الريفيوهات فيها شكاوى', true, 10),
  ('business_age', 'عمر البيزنس', 'شكله جديد ولا قديم (من تاريخ أقدم ريفيو ظاهر)', 'compass/google-maps-reviews-scraper', 2, 1, 'reviews',
     'بيزنس قديم ومستقر', 'شكله بيزنس جديد', true, 20),
  ('size_proxy', 'حجم البيزنس', 'عدد الريفيوهات والتقييم وعدد الفروع بنفس الاسم', 'Google Maps data', 2, 0, null,
     'بيزنس صغير', 'بيزنس كبير أو عنده فروع', true, 30),
  ('has_website', 'عنده موقع', 'هل له موقع إلكتروني', 'Google Maps data', 2, 0, null,
     'مالوش موقع', 'عنده موقع', true, 40),
  ('website_contacts', 'بيانات تواصل الموقع', 'إيميلات وروابط سوشيال من الموقع', 'vdrmota/contact-info-scraper', 3, 1, null,
     'مفيش بيانات تواصل ظاهرة', 'عنده إيميل وسوشيال ظاهرين', false, 50),
  ('instagram_activity', 'نشاط إنستجرام', 'المتابعين وعدد البوستات وتاريخ آخر بوست', 'apify/instagram-profile-scraper', 3, 1, null,
     'آخر بوست قديم', 'نشيط على إنستجرام', false, 60),
  ('facebook_page', 'صفحة فيسبوك', 'وجود الصفحة والمتابعين وبيانات التواصل', 'apify/facebook-pages-scraper', 3, 1, null,
     'مالوش صفحة فيسبوك', 'عنده صفحة فيسبوك نشيطة', false, 70),
  ('running_ads', 'إعلانات شغالة', 'إعلانات نشطة في مكتبة إعلانات ميتا', 'apify/facebook-ads-scraper', 3, 1, null,
     'مبيعملش إعلانات', 'بيعمل إعلانات حاليا', false, 80),
  ('decision_maker', 'صاحب القرار', 'اسم ووظيفة المالك أو المدير', 'Apollo API', 3, 0, null,
     'صاحب القرار مش معروف', 'عارفين صاحب القرار', false, 90);

-- Templates: add signals (weights are signed: negative rewards the LOW state of the signal).
update public.campaign_templates set parameters = parameters || jsonb_build_object('signals', jsonb_build_array(
    jsonb_build_object('key', 'has_website', 'weight', -60),
    jsonb_build_object('key', 'review_insights', 'weight', 50),
    jsonb_build_object('key', 'size_proxy', 'weight', 30)))
  where code = 'agency_restaurants';
update public.campaign_templates set parameters = parameters || jsonb_build_object('signals', jsonb_build_array(
    jsonb_build_object('key', 'has_website', 'weight', -50),
    jsonb_build_object('key', 'review_insights', 'weight', 40),
    jsonb_build_object('key', 'business_age', 'weight', 30)))
  where code = 'agency_clinics';
update public.campaign_templates set parameters = parameters || jsonb_build_object('signals', jsonb_build_array(
    jsonb_build_object('key', 'size_proxy', 'weight', 60),
    jsonb_build_object('key', 'business_age', 'weight', 30)))
  where code = 'packaging_cafes';

insert into public.campaign_templates (code, name_ar, source, parameters, offer_text) values
  ('accounting_smes', 'مكتب ضرايب ومحاسبة يستهدف الشركات الصغيرة', 'google_maps',
   '{"keywords":["مطعم","عيادة","صيدلية","محل ملابس","مصنع صغير"],"filters":{"min_reviews":5,"must_have_phone":true,"must_have_mobile":true,"exclude_closed":true},"channel":"whatsapp","tone":"professional","enrich_emails":false,"signals":[{"key":"business_age","weight":50},{"key":"size_proxy","weight":30},{"key":"has_website","weight":-20}]}',
   'متابعة الضرايب والفاتورة الإلكترونية والدفاتر للشركات الصغيرة من غير صداع ولا غرامات.');
