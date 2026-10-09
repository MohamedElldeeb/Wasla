-- Campaigns, jobs (with credit reservation RPCs), leads, staging, templates.

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  source text not null default 'google_maps'
    check (source in ('google_maps', 'instagram', 'facebook', 'linkedin', 'apollo')),
  parameters jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'running', 'ready', 'archived')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index campaigns_org_idx on public.campaigns (organization_id, created_at desc);
create index campaigns_created_by_idx on public.campaigns (created_by);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete cascade,
  type text not null check (type in ('ingest', 'enrich', 'generate', 'email_send')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  progress integer not null default 0 check (progress between 0 and 100),
  counts jsonb not null default '{}'::jsonb,
  error text,        -- plain Arabic, shown to users
  error_detail text, -- technical detail
  idempotency_key text not null unique,
  credits_reserved integer not null default 0 check (credits_reserved >= 0),
  credits_used integer not null default 0 check (credits_used >= 0),
  cost_usd numeric(12, 6) not null default 0,
  llm_model text,
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  requested_by uuid references auth.users (id) on delete set null,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_org_idx on public.jobs (organization_id, created_at desc);
create index jobs_campaign_idx on public.jobs (campaign_id);
create index jobs_requested_by_idx on public.jobs (requested_by);
create index jobs_active_idx on public.jobs (status) where status in ('queued', 'running');

alter table public.credit_ledger
  add constraint credit_ledger_job_id_fkey foreign key (job_id) references public.jobs (id);
create index credit_ledger_job_idx on public.credit_ledger (job_id);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  business_name text,
  category text,
  address text,
  governorate text,
  city text,
  district text,
  lat double precision,
  lng double precision,
  phone_raw text,
  phone_e164 text,
  phone_type text not null default 'unknown' check (phone_type in ('mobile', 'landline', 'unknown')),
  whatsapp_eligible boolean not null default false,
  website text,
  email text,
  facebook_url text,
  instagram_url text,
  linkedin_url text,
  rating numeric(2, 1),
  reviews_count integer,
  opening_hours jsonb,
  google_place_id text,
  google_maps_url text,
  contact_name text,
  job_title text,
  seniority text,
  company_domain text,
  source text not null,
  raw jsonb,
  dedupe_key text not null,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'replied', 'interested', 'meeting', 'won', 'lost', 'opted_out')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, dedupe_key),
  constraint leads_whatsapp_requires_mobile check (
    not whatsapp_eligible
    or (phone_type = 'mobile' and phone_e164 ~ '^\+20(10|11|12|15)[0-9]{8}$'))
);
create index leads_org_status_idx on public.leads (organization_id, status);
create index leads_org_created_idx on public.leads (organization_id, created_at desc);
create index leads_org_phone_idx on public.leads (organization_id, phone_e164);
create index leads_org_email_idx on public.leads (organization_id, lower(email));

create table public.campaign_leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, lead_id)
);
create index campaign_leads_org_idx on public.campaign_leads (organization_id);
create index campaign_leads_lead_idx on public.campaign_leads (lead_id);

-- Raw actor output awaiting normalization. Idempotent per job + external id.
create table public.lead_staging (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  source text not null,
  external_id text not null,
  raw jsonb not null,
  processed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, external_id)
);
create index lead_staging_org_idx on public.lead_staging (organization_id);

-- Global campaign templates.
create table public.campaign_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null,
  source text not null default 'google_maps',
  parameters jsonb not null default '{}'::jsonb,
  offer_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger campaigns_updated_at before update on public.campaigns
  for each row execute function public.set_updated_at();
create trigger jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();
create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();
create trigger campaign_leads_updated_at before update on public.campaign_leads
  for each row execute function public.set_updated_at();
create trigger lead_staging_updated_at before update on public.lead_staging
  for each row execute function public.set_updated_at();
create trigger campaign_templates_updated_at before update on public.campaign_templates
  for each row execute function public.set_updated_at();

-- Reserve credits and create the job atomically. Idempotent on idempotency_key.
create function public.create_job(
  p_org uuid, p_campaign uuid, p_type text, p_credits integer, p_idempotency_key text)
returns public.jobs language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  j public.jobs;
  org_status text;
begin
  if uid is null or not public.is_org_member(p_org) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_credits < 0 then
    raise exception 'invalid_credits' using errcode = 'P0001';
  end if;
  if p_campaign is not null and not exists (
    select 1 from public.campaigns c where c.id = p_campaign and c.organization_id = p_org) then
    raise exception 'campaign_not_found' using errcode = 'P0002';
  end if;

  -- Serialize per org so concurrent starts cannot overspend.
  select status into org_status from public.organizations where id = p_org for update;
  if org_status is distinct from 'active' then
    raise exception 'org_suspended' using errcode = 'P0001';
  end if;

  select * into j from public.jobs where idempotency_key = p_idempotency_key;
  if found then
    if j.organization_id <> p_org then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    return j;
  end if;

  if (select coalesce(sum(amount), 0) from public.credit_ledger where organization_id = p_org) < p_credits then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  insert into public.jobs (organization_id, campaign_id, type, credits_reserved, idempotency_key, requested_by)
  values (p_org, p_campaign, p_type, p_credits, p_idempotency_key, uid)
  returning * into j;

  if p_credits > 0 then
    insert into public.credit_ledger (organization_id, amount, kind, job_id, reason, created_by)
    values (p_org, -p_credits, 'reserve', j.id, 'job_reserve', uid);
  end if;
  return j;
end;
$$;
revoke all on function public.create_job(uuid, uuid, text, integer, text) from public, anon;
grant execute on function public.create_job(uuid, uuid, text, integer, text) to authenticated, service_role;

-- Settle a job (service role / n8n only). Charges actual usage, releases the remainder.
-- Safe to call twice: a terminal job is returned unchanged.
create function public.settle_job(
  p_job_id uuid, p_credits_used integer, p_status text, p_error text default null,
  p_counts jsonb default null, p_cost_usd numeric default null, p_llm_model text default null,
  p_tokens_in integer default null, p_tokens_out integer default null)
returns public.jobs language plpgsql security definer set search_path = '' as $$
declare
  j public.jobs;
  used integer;
begin
  if p_status not in ('succeeded', 'failed', 'cancelled') then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  select * into j from public.jobs where id = p_job_id for update;
  if not found then
    raise exception 'job_not_found' using errcode = 'P0002';
  end if;
  if j.status in ('succeeded', 'failed', 'cancelled') then
    return j;
  end if;

  used := least(greatest(coalesce(p_credits_used, 0), 0), j.credits_reserved);

  if j.credits_reserved > 0 then
    insert into public.credit_ledger (organization_id, amount, kind, job_id, reason)
    values (j.organization_id, j.credits_reserved - used, 'settle', j.id, 'job_settle')
    on conflict do nothing;
  end if;

  update public.jobs set
    status = p_status,
    progress = case when p_status = 'succeeded' then 100 else progress end,
    credits_used = used,
    error = p_error,
    counts = coalesce(p_counts, counts),
    cost_usd = coalesce(p_cost_usd, cost_usd),
    llm_model = coalesce(p_llm_model, llm_model),
    tokens_in = coalesce(p_tokens_in, tokens_in),
    tokens_out = coalesce(p_tokens_out, tokens_out),
    finished_at = now()
  where id = j.id
  returning * into j;
  return j;
end;
$$;
revoke all on function public.settle_job(uuid, integer, text, text, jsonb, numeric, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.settle_job(uuid, integer, text, text, jsonb, numeric, text, integer, integer)
  to service_role;

-- RLS
alter table public.campaigns enable row level security;
alter table public.jobs enable row level security;
alter table public.leads enable row level security;
alter table public.campaign_leads enable row level security;
alter table public.lead_staging enable row level security;
alter table public.campaign_templates enable row level security;

revoke all on public.campaigns, public.jobs, public.leads, public.campaign_leads,
  public.lead_staging, public.campaign_templates from anon, authenticated;
grant select, insert, update, delete on public.campaigns to authenticated;
grant select on public.jobs, public.leads, public.campaign_leads, public.campaign_templates to authenticated;
grant update (status) on public.leads to authenticated;
grant delete on public.leads to authenticated;

create policy campaigns_select on public.campaigns for select to authenticated
  using (public.is_org_member(organization_id));
create policy campaigns_insert on public.campaigns for insert to authenticated
  with check (public.is_org_member(organization_id) and created_by = (select auth.uid()));
create policy campaigns_update on public.campaigns for update to authenticated
  using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy campaigns_delete on public.campaigns for delete to authenticated
  using (public.is_org_owner(organization_id));

create policy jobs_select on public.jobs for select to authenticated
  using (public.is_org_member(organization_id));

create policy leads_select on public.leads for select to authenticated
  using (public.is_org_member(organization_id));
create policy leads_update on public.leads for update to authenticated
  using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy leads_delete_owner on public.leads for delete to authenticated
  using (public.is_org_owner(organization_id));

create policy campaign_leads_select on public.campaign_leads for select to authenticated
  using (public.is_org_member(organization_id));

-- lead_staging: no policies on purpose (service role only; holds raw personal data).
create policy campaign_templates_select on public.campaign_templates for select to authenticated using (true);

-- Realtime for live pipeline status.
alter publication supabase_realtime add table public.jobs;

-- Seed templates (PROPOSED content).
insert into public.campaign_templates (code, name_ar, source, parameters, offer_text) values
  ('agency_restaurants', 'وكالة تسويق تستهدف مطاعم', 'google_maps',
   '{"keywords":["مطعم","كافيه"],"filters":{"min_rating":3.5,"min_reviews":10,"must_have_phone":true,"must_have_mobile":true,"exclude_closed":true},"channel":"whatsapp","tone":"friendly","enrich_emails":false}',
   'بنساعد المطاعم تجيب طلبات أكتر من السوشيال ميديا والإعلانات الممولة.'),
  ('agency_clinics', 'وكالة تسويق تستهدف عيادات', 'google_maps',
   '{"keywords":["عيادة أسنان","عيادة جلدية"],"filters":{"min_rating":4.0,"min_reviews":10,"must_have_phone":true,"must_have_mobile":true,"exclude_closed":true},"channel":"whatsapp","tone":"professional","enrich_emails":false}',
   'بنساعد العيادات تزود الحجوزات من جوجل والسوشيال ميديا.'),
  ('packaging_cafes', 'مورد تغليف يستهدف كافيهات', 'google_maps',
   '{"keywords":["كافيه","كوفي شوب"],"filters":{"min_rating":3.5,"min_reviews":10,"must_have_phone":true,"must_have_mobile":true,"exclude_closed":true},"channel":"whatsapp","tone":"friendly","enrich_emails":false}',
   'بنوفر علب وأكواب تغليف بشعار الكافيه بكميات مناسبة وسعر كويس.');
