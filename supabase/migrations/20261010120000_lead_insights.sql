-- Spec v2.2: lead insights, fit-gated score, fresh leads across campaigns, contact cooldown, "not relevant" learning.
-- Additive only (no data is dropped). Signals that are replaced are disabled, never deleted.

-- ───────────── config as data ─────────────
create table public.app_config (
  key text primary key,
  value jsonb not null,
  note text,
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;
grant select on public.app_config to authenticated;
create policy app_config_select on public.app_config for select to authenticated using (true);
insert into public.app_config (key, value, note) values
  ('contact_cooldown_days', '30', 'PROPOSED: a lead that was sent a message cannot be sent another one from any campaign for this many days');

create function public.contact_cooldown_days()
returns integer language sql stable set search_path = '' as $$
  select coalesce((select (value #>> '{}')::integer from public.app_config where key = 'contact_cooldown_days'), 30)
$$;
revoke all on function public.contact_cooldown_days() from public, anon;
grant execute on function public.contact_cooldown_days() to authenticated, service_role;

-- True when a message to this lead was marked sent inside the cooldown window (any campaign, any channel).
create function public.in_contact_cooldown(p_lead uuid, p_except_message uuid default null)
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.messages m
    where m.lead_id = p_lead and m.review_status = 'sent'
      and m.sent_at > now() - make_interval(days => public.contact_cooldown_days())
      and (p_except_message is null or m.id <> p_except_message))
$$;
revoke all on function public.in_contact_cooldown(uuid, uuid) from public, anon;
grant execute on function public.in_contact_cooldown(uuid, uuid) to authenticated, service_role;

-- The cooldown is enforced where messages are created and where they are marked sent, not only in the UI.
create or replace function public.messages_before_insert()
returns trigger language plpgsql set search_path = '' as $$
declare l public.leads;
begin
  select * into l from public.leads where id = new.lead_id and organization_id = new.organization_id;
  if not found then
    raise exception 'lead_not_found' using errcode = 'P0002';
  end if;
  if public.is_opted_out(new.organization_id, l.phone_e164, l.email) then
    raise exception 'opted_out' using errcode = 'P0001';
  end if;
  if public.in_contact_cooldown(new.lead_id) then
    raise exception 'contact_cooldown' using errcode = 'P0001';
  end if;
  new.review_status := 'pending';
  return new;
end;
$$;

create or replace function public.messages_before_update()
returns trigger language plpgsql set search_path = '' as $$
declare
  l public.leads;
  via_rpc boolean := coalesce(current_setting('wasla.sent_rpc', true), '') = '1';
begin
  if new.review_status is distinct from old.review_status then
    if new.review_status = 'sent' then
      if old.review_status <> 'approved' then
        raise exception 'not_approved' using errcode = 'P0001';
      end if;
      select * into l from public.leads where id = new.lead_id;
      if public.is_opted_out(new.organization_id, l.phone_e164, l.email) then
        raise exception 'opted_out' using errcode = 'P0001';
      end if;
      if public.in_contact_cooldown(new.lead_id, new.id) then
        raise exception 'contact_cooldown' using errcode = 'P0001';
      end if;
      if (select auth.uid()) is not null and not via_rpc then
        raise exception 'use_mark_message_sent' using errcode = 'P0001';
      end if;
    elsif old.review_status = 'sent' then
      if (select auth.uid()) is not null and not via_rpc then
        raise exception 'use_undo_message_sent' using errcode = 'P0001';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- ───────────── campaign_leads: fit, opportunities, learning ─────────────
alter table public.campaign_leads
  add column fit text not null default 'fit' check (fit in ('fit', 'maybe')),
  add column fit_reason text,
  add column charged boolean not null default true,       -- false when the lead was already the org's (included from an earlier campaign)
  add column opportunities jsonb not null default '[]'::jsonb check (jsonb_typeof(opportunities) = 'array'),
  add column selected_opportunity text,                   -- the opportunity type the message angle is built on
  add column removed_at timestamptz,
  add column removed_reason text,
  add column removed_by uuid references auth.users (id) on delete set null;
create index campaign_leads_removed_by_idx on public.campaign_leads (removed_by);
create index campaign_leads_active_idx on public.campaign_leads (campaign_id) where removed_at is null;

-- Per-lead facts and review analysis (lead-level, refreshed on request).
create table public.lead_insights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  facts jsonb not null default '{}'::jsonb,
  analysis jsonb,                -- {praised, complaints, customer_values, summary_ar, summary_en, confidence} or {skipped: reason}
  job_id uuid references public.jobs (id) on delete set null,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id)
);
create index lead_insights_org_idx on public.lead_insights (organization_id);
create index lead_insights_job_idx on public.lead_insights (job_id);
create trigger lead_insights_updated_at before update on public.lead_insights
  for each row execute function public.set_updated_at();
alter table public.lead_insights enable row level security;
revoke all on public.lead_insights from anon, authenticated;
grant select on public.lead_insights to authenticated;
create policy lead_insights_select on public.lead_insights for select to authenticated
  using (public.is_org_member(organization_id));

-- Searches already run by the org (new campaigns prefer new districts and synonyms).
create table public.search_queries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  job_id uuid references public.jobs (id) on delete set null,
  query text not null,
  area text,
  round integer not null default 1,
  places_found integer not null default 0,
  created_at timestamptz not null default now()
);
create index search_queries_org_idx on public.search_queries (organization_id, created_at desc);
create index search_queries_campaign_idx on public.search_queries (campaign_id);
create index search_queries_job_idx on public.search_queries (job_id);
alter table public.search_queries enable row level security;
revoke all on public.search_queries from anon, authenticated;
grant select on public.search_queries to authenticated;
create policy search_queries_select on public.search_queries for select to authenticated
  using (public.is_org_member(organization_id));

-- "Not relevant" feedback: negative examples for future planning and fit checks of this organization.
create table public.negative_examples (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  business_name text,
  category text,
  reason text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index negative_examples_org_idx on public.negative_examples (organization_id, created_at desc);
create index negative_examples_campaign_idx on public.negative_examples (campaign_id);
create index negative_examples_created_by_idx on public.negative_examples (created_by);
alter table public.negative_examples enable row level security;
revoke all on public.negative_examples from anon, authenticated;
grant select on public.negative_examples to authenticated;
create policy negative_examples_select on public.negative_examples for select to authenticated
  using (public.is_org_member(organization_id));

-- ───────────── signal library v2.2 ─────────────
alter table public.signal_definitions add column baseline boolean not null default false; -- common baseline facts: low weight unless emphasized
update public.signal_definitions set baseline = true where key = 'has_website';
-- Replaced: the "business age" guess is wrong for most businesses. Disabled (not deleted) so old campaigns still read.
update public.signal_definitions set enabled = false where key = 'business_age';
update public.signal_definitions set
  name_ar = 'مضمون التقييمات',
  description_ar = 'ملخص لما يمدحه العملاء وما يشتكون منه في آخر ١٠ تقييمات، ويُستخدم فقط إذا كان عرضك يعالج ما يشتكون منه.',
  reason_low_ar = 'لا شكاوى يمكن لعرضك معالجتها', reason_high_ar = 'تقييمات تشير إلى مشكلة يعالجها عرضك'
  where key = 'review_insights';

insert into public.signal_definitions
  (key, name_ar, description_ar, source, phase, credit_cost, cost_group, reason_low_ar, reason_high_ar, enabled, sort_order, baseline) values
  ('activity', 'النشاط', 'هل النشاط حديث أم خامل، من تاريخ آخر تقييم.', 'compass/google-maps-reviews-scraper', 2, 1, 'reviews',
     'لا توجد تقييمات حديثة', 'نشط: تقييمات حديثة', true, 11, false),
  ('owner_engagement', 'تفاعل المالك', 'نسبة التقييمات التي رد عليها المالك.', 'compass/google-maps-reviews-scraper', 2, 1, 'reviews',
     'نادرًا ما يرد على التقييمات', 'يرد على التقييمات', true, 12, false),
  ('unanswered_low_reviews', 'تقييمات منخفضة بلا رد', 'عدد التقييمات من نجمة إلى نجمتين التي لم يرد عليها المالك.', 'compass/google-maps-reviews-scraper', 2, 1, 'reviews',
     'لا توجد تقييمات منخفضة بلا رد', 'توجد تقييمات منخفضة بلا رد', true, 13, false),
  ('rating_trend', 'اتجاه التقييم', 'متوسط التقييمات الأخيرة مقارنة بالتقييم العام.', 'compass/google-maps-reviews-scraper', 2, 1, 'reviews',
     'التقييمات الأخيرة أقل من المعتاد', 'التقييمات الأخيرة أفضل من المعتاد', true, 14, false),
  ('new_business', 'نشاط جديد', 'يظهر فقط إذا كانت التقييمات الظاهرة تغطي كل تاريخ النشاط وبدأ خلال سنة.', 'compass/google-maps-reviews-scraper', 2, 1, 'reviews',
     'نشاط قائم منذ فترة', 'يبدو نشاطًا جديدًا', true, 15, false),
  ('unclaimed_listing', 'صفحة غير موثقة', 'صفحة الخرائط لم يوثقها المالك.', 'Google Maps data', 2, 0, null,
     'الصفحة موثقة', 'صفحة الخرائط غير موثقة', true, 35, false),
  ('profile_completeness', 'اكتمال الصفحة', 'عدد الصور ووجود ساعات العمل.', 'Google Maps data', 2, 0, null,
     'صفحة ناقصة (صور أو ساعات عمل)', 'صفحة مكتملة', true, 36, false);

-- ───────────── scoring v2.2 (mirrors lib/insights/core.mjs scoreLead) ─────────────
--   w > 0 rewards the HIGH state, w < 0 the LOW state; contribution = w*v - min(w,0); score = 100*sum(c)/sum(|w|)
--   * baseline signals (e.g. has a website) are clamped to |w| <= 25 unless the campaign marks the signal "emphasis": true
--   * fewer than two relevant (non-baseline) favorable signals => score cannot exceed 69
--   * fit "maybe" => score cannot exceed 60;  removed leads are not scored
create or replace function public.recompute_campaign_scores(p_campaign uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  org uuid;
  updated integer;
begin
  select organization_id into org from public.campaigns where id = p_campaign;
  if org is null then
    raise exception 'campaign_not_found' using errcode = 'P0002';
  end if;
  if (select auth.uid()) is not null and not public.is_org_member(org) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with cfg as (
    select s ->> 'key' as key, (s ->> 'weight')::numeric as raw_weight,
           coalesce((s ->> 'emphasis') = 'true', false) as emphasis
    from public.campaigns c,
         jsonb_array_elements(coalesce(c.parameters -> 'signals', '[]'::jsonb)) s
    where c.id = p_campaign
      and s ->> 'key' is not null
      and (s ->> 'weight') ~ '^-?[0-9]+(\.[0-9]+)?$'
      and (s ->> 'weight')::numeric <> 0
  ),
  vals as (
    select cl.id as cl_id, cl.fit, cfg.key,
           case when sd.baseline and not cfg.emphasis then sign(cfg.raw_weight) * least(abs(cfg.raw_weight), 25) else cfg.raw_weight end as weight,
           (sd.baseline and not cfg.emphasis) as is_baseline,
           greatest(0, least(1, (ls.normalized ->> 'value')::numeric)) as nv,
           ls.normalized ->> 'label_ar' as custom_label,
           sd.reason_low_ar, sd.reason_high_ar
    from public.campaign_leads cl
    join cfg on true
    join public.lead_signals ls on ls.lead_id = cl.lead_id and ls.signal_key = cfg.key
    join public.signal_definitions sd on sd.key = cfg.key
    where cl.campaign_id = p_campaign and cl.removed_at is null
  ),
  contrib as (
    select cl_id, fit, key, weight, nv, custom_label, is_baseline,
           weight * nv - least(weight, 0) as c,
           (weight > 0 and nv >= 0.66) or (weight < 0 and nv <= 0.34) as fav,
           case
             when weight > 0 and nv >= 0.66 then coalesce(custom_label, reason_high_ar)
             when weight < 0 and nv <= 0.34 then reason_low_ar
           end as reason,
           case
             when weight > 0 and nv >= 0.66 then 'high'
             when weight < 0 and nv <= 0.34 then 'low'
           end as side
    from vals
  ),
  scores as (
    select cl_id,
           least(
             least(round(100 * sum(c) / nullif(sum(abs(weight)), 0)),
                   case when count(*) filter (where fav and not is_baseline) < 2 then 69 else 100 end),
             case when max(fit) = 'maybe' then 60 else 100 end)::smallint as score
    from contrib group by cl_id
  ),
  ranked as (
    select cl_id, key, side, reason, custom_label, c,
           row_number() over (partition by cl_id order by c desc, reason) as rn
    from contrib where reason is not null and c > 0
  ),
  reasons as (
    select cl_id,
           jsonb_agg(reason order by rn) as reasons,
           jsonb_agg(
             case when side = 'high' and custom_label is not null
                  then jsonb_build_object('k', key, 's', side, 'label', custom_label)
                  else jsonb_build_object('k', key, 's', side) end
             order by rn) as keys
    from ranked where rn <= 3 group by cl_id
  ),
  upd as (
    update public.campaign_leads cl
    set opportunity_score = s.score,
        score_reasons = coalesce(r.reasons, '[]'::jsonb),
        score_reason_keys = coalesce(r.keys, '[]'::jsonb),
        scored_at = now()
    from public.campaign_leads x
    left join scores s on s.cl_id = x.id
    left join reasons r on r.cl_id = x.id
    where cl.id = x.id and x.campaign_id = p_campaign and x.removed_at is null
    returning 1
  )
  select count(*) into updated from upd;
  return updated;
end;
$$;

-- ───────────── ingest v3: fresh leads, cooldown, fit (service role only) ─────────────
drop function public.ingest_leads(uuid, uuid, jsonb);
create function public.ingest_leads(p_org uuid, p_campaign uuid, p_leads jsonb, p_include_previous boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  received integer;
  n_opt integer;
  n_cool integer;
  n_prev integer;
  n_own integer;
  kept integer;
  inserted integer;
  linked integer;
  known_linked integer;
begin
  if not exists (select 1 from public.campaigns c where c.id = p_campaign and c.organization_id = p_org) then
    raise exception 'campaign_not_found' using errcode = 'P0002';
  end if;

  drop table if exists pg_temp._in;
  create temporary table _in on commit drop as
  select * from jsonb_to_recordset(p_leads) as x(
    business_name text, category text, address text, governorate text, city text, district text,
    lat double precision, lng double precision, phone_raw text, phone_e164 text, phone_type text,
    whatsapp_eligible boolean, website text, email text, facebook_url text, instagram_url text,
    linkedin_url text, rating numeric, reviews_count integer, opening_hours jsonb,
    google_place_id text, google_maps_url text, contact_name text, job_title text, seniority text,
    company_domain text, source text, raw jsonb, dedupe_key text, fit text, fit_reason text);

  select count(*) into received from _in;

  -- permanent opt-outs (hard rule 3)
  delete from _in i
  where exists (
    select 1 from public.opt_outs o
    where o.organization_id = p_org
      and ((i.phone_e164 is not null and o.phone_e164 = i.phone_e164)
        or (i.email is not null and o.email = lower(i.email))));
  select received - count(*) into n_opt from _in;

  -- already in THIS campaign (earlier round or a re-run): silently the same lead
  drop table if exists pg_temp._own;
  create temporary table _own on commit drop as
  select i.dedupe_key from _in i
  join public.leads l on l.organization_id = p_org and l.dedupe_key = i.dedupe_key
  join public.campaign_leads cl on cl.lead_id = l.id and cl.campaign_id = p_campaign;
  delete from _in i where i.dedupe_key in (select dedupe_key from _own);
  select count(*) into n_own from _own;
  drop table _own;

  -- contact cooldown: always on, whatever the include-previous option says
  delete from _in i
  where exists (
    select 1 from public.leads l
    where l.organization_id = p_org and l.dedupe_key = i.dedupe_key and public.in_contact_cooldown(l.id));
  get diagnostics n_cool = row_count;

  -- fresh leads across campaigns: by default skip companies the org already has
  n_prev := 0;
  if not p_include_previous then
    delete from _in i
    where exists (select 1 from public.leads l where l.organization_id = p_org and l.dedupe_key = i.dedupe_key);
    get diagnostics n_prev = row_count;
  end if;

  select count(*) into kept from _in;

  drop table if exists pg_temp._new;
  create temporary table _new on commit drop as
  with ins as (
    insert into public.leads (
      organization_id, business_name, category, address, governorate, city, district, lat, lng,
      phone_raw, phone_e164, phone_type, whatsapp_eligible, website, email, facebook_url,
      instagram_url, linkedin_url, rating, reviews_count, opening_hours, google_place_id,
      google_maps_url, contact_name, job_title, seniority, company_domain, source, raw, dedupe_key)
    select p_org, business_name, category, address, governorate, city, district, lat, lng,
      phone_raw, phone_e164, coalesce(phone_type, 'unknown'), coalesce(whatsapp_eligible, false), website,
      email, facebook_url, instagram_url, linkedin_url, rating, reviews_count, opening_hours,
      google_place_id, google_maps_url, contact_name, job_title, seniority, company_domain,
      source, raw, dedupe_key
    from _in
    on conflict (organization_id, dedupe_key) do nothing
    returning dedupe_key)
  select dedupe_key from ins;
  select count(*) into inserted from _new;

  with lk as (
    insert into public.campaign_leads (organization_id, campaign_id, lead_id, fit, fit_reason, charged)
    select p_org, p_campaign, l.id,
           case when i.fit = 'maybe' then 'maybe' else 'fit' end, left(i.fit_reason, 300),
           (i.dedupe_key in (select dedupe_key from _new))
    from _in i
    join public.leads l on l.organization_id = p_org and l.dedupe_key = i.dedupe_key
    on conflict (campaign_id, lead_id) do nothing
    returning charged)
  select count(*), count(*) filter (where not charged) into linked, known_linked from lk;
  drop table _new;

  return jsonb_build_object(
    'received', received,
    'dropped_opted_out', n_opt,
    'already_in_campaign', n_own,
    'cooldown', n_cool,
    'previously_found', n_prev,
    'new', inserted,
    'already_known', known_linked,
    'newly_linked', linked);
end;
$$;
revoke all on function public.ingest_leads(uuid, uuid, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.ingest_leads(uuid, uuid, jsonb, boolean) to service_role;

-- ───────────── "Not relevant": remove, refund, learn ─────────────
create unique index credit_ledger_not_relevant_unique on public.credit_ledger (reason)
  where kind = 'refund' and job_id is null and reason like 'not_relevant:%';

create function public.mark_not_relevant(p_campaign_lead uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  cl public.campaign_leads;
  l public.leads;
  per_lead integer;
  refund integer := 0;
  uid uuid := (select auth.uid());
begin
  select * into cl from public.campaign_leads where id = p_campaign_lead for update;
  if not found or uid is null or not public.is_org_member(cl.organization_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if cl.removed_at is not null then
    return jsonb_build_object('refunded', 0, 'already', true);
  end if;
  select * into l from public.leads where id = cl.lead_id;
  if exists (select 1 from public.messages m where m.lead_id = cl.lead_id and m.campaign_id = cl.campaign_id and m.review_status = 'sent') then
    raise exception 'already_sent' using errcode = 'P0001';
  end if;

  update public.campaign_leads
  set removed_at = now(), removed_reason = left(nullif(btrim(p_reason), ''), 300), removed_by = uid,
      opportunity_score = null, score_reasons = '[]'::jsonb, score_reason_keys = '[]'::jsonb
  where id = cl.id;
  update public.messages set review_status = 'rejected'
  where lead_id = cl.lead_id and campaign_id = cl.campaign_id and review_status in ('pending', 'approved');

  insert into public.negative_examples (organization_id, campaign_id, business_name, category, reason, created_by)
  values (cl.organization_id, cl.campaign_id, l.business_name, l.category, left(nullif(btrim(p_reason), ''), 300), uid);

  if cl.charged then
    select 1 + coalesce(public.signal_credits_per_lead(c.parameters -> 'signals'), 0) into per_lead
    from public.campaigns c where c.id = cl.campaign_id;
    refund := coalesce(per_lead, 1);
    insert into public.credit_ledger (organization_id, amount, kind, reason, created_by)
    values (cl.organization_id, refund, 'refund', 'not_relevant:' || cl.id::text, uid)
    on conflict do nothing;
  end if;
  return jsonb_build_object('refunded', refund, 'already', false);
end;
$$;
revoke all on function public.mark_not_relevant(uuid, text) from public, anon;
grant execute on function public.mark_not_relevant(uuid, text) to authenticated;

-- Probe jobs (cheap sample before the full run)
alter table public.jobs drop constraint jobs_type_check;
alter table public.jobs add constraint jobs_type_check
  check (type in ('ingest', 'enrich', 'generate', 'email_send', 'plan', 'signals', 'probe', 'interview'));
