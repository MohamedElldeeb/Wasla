-- Atomic, idempotent lead ingestion used by n8n (WF2). Service role only.
--   * drops opted-out leads (rule 3), by phone or email
--   * inserts new leads (unique per org on dedupe_key), never duplicates, never overwrites existing leads
--   * links every surviving lead (new or already known) to the campaign
--   * returns counts so credits are charged only for NEW leads (spec 6.3)

create function public.ingest_leads(p_org uuid, p_campaign uuid, p_leads jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  received integer;
  kept integer;
  inserted integer;
  linked integer;
begin
  if not exists (select 1 from public.campaigns c where c.id = p_campaign and c.organization_id = p_org) then
    raise exception 'campaign_not_found' using errcode = 'P0002';
  end if;

  create temporary table _in on commit drop as
  select * from jsonb_to_recordset(p_leads) as x(
    business_name text, category text, address text, governorate text, city text, district text,
    lat double precision, lng double precision, phone_raw text, phone_e164 text, phone_type text,
    whatsapp_eligible boolean, website text, email text, facebook_url text, instagram_url text,
    linkedin_url text, rating numeric, reviews_count integer, opening_hours jsonb,
    google_place_id text, google_maps_url text, contact_name text, job_title text, seniority text,
    company_domain text, source text, raw jsonb, dedupe_key text);

  select count(*) into received from _in;

  delete from _in i
  where exists (
    select 1 from public.opt_outs o
    where o.organization_id = p_org
      and ((i.phone_e164 is not null and o.phone_e164 = i.phone_e164)
        or (i.email is not null and o.email = lower(i.email))));
  select count(*) into kept from _in;

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
    returning 1)
  select count(*) into inserted from ins;

  with lk as (
    insert into public.campaign_leads (organization_id, campaign_id, lead_id)
    select p_org, p_campaign, l.id
    from _in i
    join public.leads l on l.organization_id = p_org and l.dedupe_key = i.dedupe_key
    on conflict (campaign_id, lead_id) do nothing
    returning 1)
  select count(*) into linked from lk;

  return jsonb_build_object(
    'received', received,
    'dropped_opted_out', received - kept,
    'new', inserted,
    'already_known', kept - inserted,
    'newly_linked', linked);
end;
$$;
revoke all on function public.ingest_leads(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.ingest_leads(uuid, uuid, jsonb) to service_role;
