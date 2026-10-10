-- RLS and business-rule tests. Run against the DEV project only (never production).
-- Everything runs in one transaction that is rolled back at the end by a final
-- exception: the message "ALL N CHECKS PASSED" means success; "FAIL: ..." names the first failure.

create function pg_temp.q(r text, uid uuid, s text) returns text language plpgsql as $f$
declare res text;
begin
  execute format('set local role %I', r);
  perform set_config('request.jwt.claims',
    case when uid is null then '{}' else json_build_object('sub', uid, 'role', r)::text end, true);
  if lower(ltrim(s)) like 'select%' or lower(ltrim(s)) like 'with%' then
    execute s into res;
  else
    execute s;
  end if;
  reset role;
  perform set_config('request.jwt.claims', '{}', true);
  return res;
end $f$;

-- Returns 'OK' or 'SQLSTATE:message'.
create function pg_temp.err(r text, uid uuid, s text) returns text language plpgsql as $f$
begin
  perform pg_temp.q(r, uid, s);
  return 'OK';
exception when others then
  return sqlstate || ':' || sqlerrm;
end $f$;

create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $f$
begin
  if cond is not true then raise exception 'FAIL: %', msg; end if;
end $f$;

do $$
declare
  a uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  b uuid := 'bbbbbbbb-0000-0000-0000-000000000002';
  zero uuid := '00000000-0000-0000-0000-000000000000';
  org_a uuid; org_b uuid; camp_a uuid; lead_a uuid; lead_b uuid; lead_land uuid; lead2 uuid;
  msg uuid; msg2 uuid; msg_land uuid; jid uuid; r text; n int := 0;
  camp2 uuid; l_ing1 uuid; l_ing2 uuid; msg_c2 uuid; bal0 int; cl_ing2 uuid; cl_a uuid; res jsonb;
begin
  insert into auth.users (id, instance_id, aud, role, email) values
    (a, zero, 'authenticated', 'authenticated', 'a@test.local'),
    (b, zero, 'authenticated', 'authenticated', 'b@test.local');
  perform pg_temp.ok((select count(*) from public.profiles where user_id in (a, b)) = 2, 'profiles auto-created');

  -- Org bootstrap
  org_a := pg_temp.q('authenticated', a, $q$select public.create_organization('Org A')$q$)::uuid;
  org_b := pg_temp.q('authenticated', b, $q$select public.create_organization('Org B')$q$)::uuid;
  perform pg_temp.ok(pg_temp.q('authenticated', a, format('select public.org_credit_balance(%L)', org_a)) = '50', 'free grant = 50');
  perform pg_temp.ok(pg_temp.q('authenticated', a, format('select public.org_credit_balance(%L)', org_b)) = '0', 'A cannot see B balance');

  -- Tenant isolation on reads
  perform pg_temp.ok(pg_temp.q('authenticated', a, 'select count(*) from public.organizations') = '1', 'A sees 1 org');
  perform pg_temp.ok(pg_temp.q('authenticated', a, 'select count(*) from public.memberships') = '1', 'A sees own membership only');
  perform pg_temp.ok(pg_temp.q('authenticated', a, 'select count(*) from public.credit_ledger') = '1', 'A sees own ledger only');
  perform pg_temp.ok(pg_temp.q('authenticated', a, 'select count(*) from public.plans') = '3', 'plans readable');
  perform pg_temp.ok(pg_temp.q('authenticated', a, 'select count(*) from public.campaign_templates') = '4', 'templates readable');
  perform pg_temp.ok(pg_temp.err('anon', null, 'select count(*) from public.organizations') like '42501%', 'anon blocked from orgs');
  perform pg_temp.ok(pg_temp.q('authenticated', a, 'select count(*) from public.signal_definitions') = '16', 'signal library readable');
  perform pg_temp.ok(pg_temp.err('anon', null, 'select count(*) from public.signal_definitions') like '42501%', 'anon blocked from signal library');
  perform pg_temp.ok(pg_temp.err('anon', null, 'select count(*) from public.plans') like '42501%', 'anon blocked from plans');
  perform pg_temp.ok(pg_temp.err('authenticated', a, 'select count(*) from public.lead_staging') like '42501%', 'lead_staging not readable by users');
  perform pg_temp.ok(pg_temp.err('authenticated', a, 'select count(*) from public.org_secrets') like '42501%', 'org_secrets not readable');
  perform pg_temp.ok(pg_temp.err('authenticated', a, 'select count(*) from public.admin_events') like '42501%', 'admin_events not readable');

  -- Privilege escalation attempts
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('update public.organizations set status = %L where id = %L', 'suspended', org_a)) like '42501%', 'owner cannot change org status');
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('insert into public.credit_ledger (organization_id, amount, kind) values (%L, 999, %L)', org_a, 'grant')) like '42501%', 'user cannot insert ledger');
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('update public.profiles set is_platform_admin = true where user_id = %L', a)) like '42501%', 'user cannot self-promote to admin');
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('insert into public.memberships (organization_id, user_id, role) values (%L, %L, %L)', org_b, a, 'owner')) like '42501%', 'user cannot add self to other org');
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('insert into public.campaigns (organization_id, name, created_by) values (%L, %L, %L)', org_b, 'x', a)) like '42501%', 'A cannot create campaign in B org');

  -- Ledger is append-only (even for superuser)
  perform pg_temp.ok(pg_temp.err('postgres', null, 'update public.credit_ledger set amount = 0') like 'P0001%', 'ledger update blocked');
  perform pg_temp.ok(pg_temp.err('postgres', null, 'delete from public.credit_ledger') like 'P0001%', 'ledger delete blocked');

  -- Last owner guard
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('delete from public.memberships where organization_id = %L', org_a)) like '%last_owner%', 'last owner cannot leave');

  -- Campaign + jobs + credits
  camp_a := pg_temp.q('authenticated', a, format('with i as (insert into public.campaigns (organization_id, name, created_by) values (%L, %L, %L) returning id) select id from i', org_a, 'حملة تجريبية', a))::uuid;
  jid := pg_temp.q('authenticated', a, format('select (public.create_job(%L, %L, %L, 10, %L)).id', org_a, camp_a, 'ingest', 'k1'))::uuid;
  perform pg_temp.ok(pg_temp.q('authenticated', a, format('select public.org_credit_balance(%L)', org_a)) = '40', 'reserve debits 10');
  perform pg_temp.ok(pg_temp.q('authenticated', a, format('select (public.create_job(%L, %L, %L, 10, %L)).id', org_a, camp_a, 'ingest', 'k1'))::uuid = jid, 'create_job idempotent');
  perform pg_temp.ok(pg_temp.q('authenticated', a, format('select public.org_credit_balance(%L)', org_a)) = '40', 'no double reserve');
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('select public.create_job(%L, null, %L, 1000, %L)', org_a, 'ingest', 'k2')) like '%insufficient_credits%', 'insufficient credits blocked');
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('select public.create_job(%L, null, %L, 1, %L)', org_b, 'ingest', 'k3')) like '42501%', 'A cannot start job in B org');
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('select public.settle_job(%L, 4, %L)', jid, 'succeeded')) like '42501%', 'users cannot settle jobs');
  perform pg_temp.q('service_role', null, format('select public.settle_job(%L, 4, %L)', jid, 'succeeded'));
  perform pg_temp.ok(pg_temp.q('authenticated', a, format('select public.org_credit_balance(%L)', org_a)) = '46', 'settle refunds unused 6');
  perform pg_temp.q('service_role', null, format('select public.settle_job(%L, 9, %L)', jid, 'succeeded'));
  perform pg_temp.ok(pg_temp.q('authenticated', a, format('select public.org_credit_balance(%L)', org_a)) = '46', 'settle idempotent');
  perform pg_temp.ok(pg_temp.q('authenticated', b, 'select count(*) from public.jobs') = '0', 'B cannot see A jobs');

  -- Leads
  insert into public.leads (organization_id, business_name, phone_e164, phone_type, whatsapp_eligible, source, dedupe_key)
    values (org_a, 'مطعم أ', '+201012345678', 'mobile', true, 'google_maps', 'p1') returning id into lead_a;
  insert into public.leads (organization_id, business_name, phone_e164, phone_type, whatsapp_eligible, source, dedupe_key)
    values (org_a, 'كافيه ب', '+201112345678', 'mobile', true, 'google_maps', 'p2') returning id into lead2;
  insert into public.leads (organization_id, business_name, phone_e164, phone_type, whatsapp_eligible, source, dedupe_key)
    values (org_a, 'عيادة', '+20224123456', 'landline', false, 'google_maps', 'p3') returning id into lead_land;
  insert into public.leads (organization_id, business_name, phone_e164, phone_type, whatsapp_eligible, source, dedupe_key)
    values (org_b, 'مطعم ب', '+201012345679', 'mobile', true, 'google_maps', 'p1') returning id into lead_b; -- same key, other org: allowed
  perform pg_temp.ok(pg_temp.q('authenticated', a, 'select count(*) from public.leads') = '3', 'A sees only own leads');
  perform pg_temp.ok(pg_temp.err('postgres', null, format('insert into public.leads (organization_id, source, dedupe_key) values (%L, %L, %L)', org_a, 'google_maps', 'p1')) like '23505%', 'dedupe unique per org');
  perform pg_temp.ok(pg_temp.err('postgres', null, format('update public.leads set whatsapp_eligible = true where id = %L', lead_land)) like '23514%', 'landline cannot be whatsapp eligible');
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('update public.leads set business_name = %L where id = %L', 'x', lead_a)) like '42501%', 'users can only change lead status');
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('update public.leads set status = %L where id = %L', 'replied', lead_a)) = 'OK', 'user can change lead status');
  perform pg_temp.q('authenticated', a, format('update public.leads set status = %L where id = %L', 'new', lead_a));


  -- Offer profile shape (content is free, structure is validated)
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('update public.organizations set offer_profile = %L where id = %L', '{"what_we_sell":"محاسبة وضرايب","ideal_customer":"شركات صغيرة","regions":[{"governorate":"القاهرة"}]}', org_a)) = 'OK', 'valid offer profile accepted');
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('update public.organizations set offer_profile = %L where id = %L', '{"regions":"cairo"}', org_a)) like '23514%', 'regions must be an array');
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('update public.organizations set offer_profile = %L where id = %L', '{"what_we_sell":5}', org_a)) like '23514%', 'what_we_sell must be text');

  -- Signals, opportunity score (weights are per campaign and signed)
  insert into public.campaign_leads (organization_id, campaign_id, lead_id)
    select org_a, camp_a, id from public.leads where organization_id = org_a;
  insert into public.lead_signals (organization_id, lead_id, signal_key, normalized, source) values
    (org_a, lead_a,    'has_website', '{"value":0}', 'test'),
    (org_a, lead_a,    'size_proxy',  '{"value":1}', 'test'),
    (org_a, lead2,     'has_website', '{"value":1}', 'test'),
    (org_a, lead2,     'size_proxy',  '{"value":0}', 'test'),
    (org_a, lead_land, 'review_insights', '{"value":0.9,"label_ar":"التقييمات تشكو من التأخير"}', 'test');
  perform pg_temp.ok(pg_temp.err('postgres', null, format('insert into public.lead_signals (organization_id, lead_id, signal_key, normalized, source) values (%L, %L, %L, %L, %L)', org_a, lead_a, 'has_website', '{"value":0.5}', 'dup')) like '23505%', 'one value per lead and signal');
  perform pg_temp.ok(pg_temp.err('postgres', null, format('insert into public.lead_signals (organization_id, lead_id, signal_key, normalized, source) values (%L, %L, %L, %L, %L)', org_a, lead_a, 'review_insights', '{"value":2}', 'bad')) like '23514%', 'normalized value must be within 0..1');
  perform pg_temp.ok(pg_temp.q('authenticated', a, 'select count(*) from public.lead_signals') = '5', 'A sees own signals');
  perform pg_temp.ok(pg_temp.q('authenticated', b, 'select count(*) from public.lead_signals') = '0', 'B cannot see A signals');
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('insert into public.lead_signals (organization_id, lead_id, signal_key, normalized, source) values (%L, %L, %L, %L, %L)', org_a, lead_a, 'review_insights', '{"value":1}', 'x')) like '42501%', 'users cannot write signals');
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('update public.campaign_leads set opportunity_score = 100 where campaign_id = %L', camp_a)) like '42501%', 'users cannot write scores');
  perform pg_temp.q('authenticated', a, format('update public.campaigns set parameters = %L where id = %L', '{"signals":[{"key":"has_website","weight":-60},{"key":"size_proxy","weight":30},{"key":"review_insights","weight":50}]}', camp_a));
  perform pg_temp.ok(pg_temp.err('authenticated', b, format('select public.recompute_campaign_scores(%L)', camp_a)) like '42501%', 'B cannot score A campaign');
  perform pg_temp.ok(pg_temp.q('authenticated', a, format('select public.recompute_campaign_scores(%L)', camp_a)) = '3', 'scored all campaign leads');
  perform pg_temp.ok((select opportunity_score from public.campaign_leads where lead_id = lead_a and campaign_id = camp_a) = 69, 'no website (baseline, clamped) + one relevant signal cannot pass 69');
  perform pg_temp.ok((select score_reasons from public.campaign_leads where lead_id = lead_a and campaign_id = camp_a) = '["نشاط كبير أو متعدد الفروع","لا يملك موقعًا إلكترونيًا"]'::jsonb, 'reasons ordered by contribution');
  perform pg_temp.ok((select score_reason_keys from public.campaign_leads where lead_id = lead_a and campaign_id = camp_a) = '[{"k":"size_proxy","s":"high"},{"k":"has_website","s":"low"}]'::jsonb, 'reason keys are localizable');
  perform pg_temp.ok((select opportunity_score from public.campaign_leads where lead_id = lead2 and campaign_id = camp_a) = 0, 'has website + small = 0 for this campaign');
  perform pg_temp.ok((select score_reasons from public.campaign_leads where lead_id = lead2 and campaign_id = camp_a) = '[]'::jsonb, 'no favorable reasons');
  perform pg_temp.ok((select opportunity_score from public.campaign_leads where lead_id = lead_land and campaign_id = camp_a) = 69, 'one relevant signal alone is capped at 69');
  perform pg_temp.ok((select score_reasons ->> 0 from public.campaign_leads where lead_id = lead_land and campaign_id = camp_a) = 'التقييمات تشكو من التأخير', 'custom reason label used');
  perform pg_temp.ok((select score_reason_keys -> 0 ->> 'label' from public.campaign_leads where lead_id = lead_land and campaign_id = camp_a) = 'التقييمات تشكو من التأخير', 'custom label kept in keys');
  -- Same signals, opposite offer: the weight sign flips the meaning
  perform pg_temp.q('authenticated', a, format('update public.campaigns set parameters = %L where id = %L', '{"signals":[{"key":"has_website","weight":60},{"key":"size_proxy","weight":30}]}', camp_a));
  perform pg_temp.q('authenticated', a, format('select public.recompute_campaign_scores(%L)', camp_a));
  perform pg_temp.ok((select opportunity_score from public.campaign_leads where lead_id = lead_a and campaign_id = camp_a) = 55, 'opposite weights flip the score (baseline weight clamped to 25)');
  perform pg_temp.ok((select opportunity_score from public.campaign_leads where lead_id = lead_land and campaign_id = camp_a) is null, 'no collected signals = no score');
  perform pg_temp.ok(pg_temp.q('authenticated', a, $q$select public.signal_credits_per_lead('[{"key":"review_insights"},{"key":"business_age"},{"key":"has_website"},{"key":"instagram_activity"}]')$q$) = '1', 'shared cost group charged once, disabled signals ignored');
  perform pg_temp.q('authenticated', a, format('update public.campaigns set parameters = %L where id = %L', '{}', camp_a));

  -- Messages and sending rules
  insert into public.messages (organization_id, lead_id, campaign_id, channel, generated_text)
    values (org_a, lead_a, camp_a, 'whatsapp', 'اهلا') returning id into msg;
  insert into public.messages (organization_id, lead_id, campaign_id, channel, generated_text)
    values (org_a, lead2, camp_a, 'whatsapp', 'اهلا 2') returning id into msg2;
  insert into public.messages (organization_id, lead_id, campaign_id, channel, generated_text)
    values (org_a, lead_land, camp_a, 'whatsapp', 'اهلا 3') returning id into msg_land;
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('select public.mark_message_sent(%L)', msg)) like '%not_approved%', 'cannot send unreviewed message');
  perform pg_temp.ok(pg_temp.err('postgres', null, format('update public.messages set review_status = %L where id = %L', 'sent', msg)) like '%not_approved%', 'even service cannot skip review');
  perform pg_temp.ok(pg_temp.q('authenticated', b, 'select count(*) from public.messages') = '0', 'B cannot see A messages');
  perform pg_temp.q('authenticated', a, format('update public.messages set review_status = %L where id in (%L, %L, %L)', 'approved', msg, msg2, msg_land));
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('update public.messages set review_status = %L where id = %L', 'sent', msg)) like '%use_mark_message_sent%', 'direct sent update blocked for users');
  perform pg_temp.ok(pg_temp.err('authenticated', b, format('select public.mark_message_sent(%L)', msg)) like 'P0002%', 'B cannot send A message');
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('select public.mark_message_sent(%L)', msg_land)) like '%not_whatsapp_eligible%', 'landline cannot be sent via whatsapp');

  perform pg_temp.q('authenticated', a, format('select public.mark_message_sent(%L)', msg));
  perform pg_temp.ok((select review_status from public.messages where id = msg) = 'sent', 'message marked sent');
  perform pg_temp.ok((select count from public.daily_send_counters where organization_id = org_a) = 1, 'counter incremented');
  perform pg_temp.ok((select status from public.leads where id = lead_a) = 'contacted', 'lead becomes contacted');
  perform pg_temp.q('authenticated', a, format('select public.undo_message_sent(%L)', msg));
  perform pg_temp.ok((select review_status from public.messages where id = msg) = 'approved', 'undo restores approved');
  perform pg_temp.ok((select count from public.daily_send_counters where organization_id = org_a) = 0, 'counter decremented on undo');
  perform pg_temp.ok((select status from public.leads where id = lead_a) = 'new', 'lead back to new');

  -- Daily cap
  perform pg_temp.q('authenticated', a, format('update public.organizations set wa_daily_cap = 1 where id = %L', org_a));
  perform pg_temp.ok(pg_temp.q('authenticated', a, format('select public.can_send_whatsapp(%L)', org_a)) = 'true', 'cap not reached yet');
  perform pg_temp.q('authenticated', a, format('select public.mark_message_sent(%L)', msg));
  perform pg_temp.ok(pg_temp.q('authenticated', a, format('select public.can_send_whatsapp(%L)', org_a)) = 'false', 'cap reached');
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('select public.mark_message_sent(%L)', msg2)) like '%daily_cap_reached%', 'cap enforced');

  -- Opt-outs
  perform pg_temp.q('authenticated', a, format('insert into public.opt_outs (organization_id, phone_e164, created_by) values (%L, %L, %L)', org_a, '+201112345678', a));
  perform pg_temp.ok((select status from public.leads where id = lead2) = 'opted_out', 'opt-out flags lead');
  perform pg_temp.ok((select review_status from public.messages where id = msg2) = 'rejected', 'opt-out rejects open messages');
  perform pg_temp.ok(pg_temp.err('postgres', null, format('insert into public.messages (organization_id, lead_id, campaign_id, channel, generated_text) values (%L, %L, %L, %L, %L)', org_a, lead2, camp_a, 'messenger', 'x')) like '%opted_out%', 'no generation for opted-out lead');
  perform pg_temp.ok(pg_temp.q('authenticated', b, format('select public.is_opted_out(%L, %L, null)', org_b, '+201112345678')) = 'false', 'opt-out is per org');

  -- ingest_leads: service-only, drops opted-out, charges only NEW leads, idempotent, links to campaign
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('select public.ingest_leads(%L, %L, %L)', org_a, camp_a, '[]')) like '42501%', 'users cannot call ingest_leads');
  perform pg_temp.ok(
    (pg_temp.q('service_role', null, format('select public.ingest_leads(%L, %L, %L)', org_a, camp_a,
      '[{"business_name":"جديد 1","phone_e164":"+201511111111","phone_type":"mobile","whatsapp_eligible":true,"source":"google_maps","dedupe_key":"ing1","rating":4.5,"reviews_count":12},{"business_name":"جديد 2","phone_e164":"+201211111112","phone_type":"mobile","whatsapp_eligible":true,"source":"google_maps","dedupe_key":"ing2"},{"business_name":"ممنوع","phone_e164":"+201112345678","source":"google_maps","dedupe_key":"ing3"},{"business_name":"موجود","phone_e164":"+201012345678","source":"google_maps","dedupe_key":"p1"}]'))::jsonb)
    = '{"new": 2, "cooldown": 0, "received": 4, "newly_linked": 2, "already_known": 0, "previously_found": 0, "dropped_opted_out": 1, "already_in_campaign": 1}'::jsonb, 'ingest counts: 2 new, 1 already in this campaign, 1 opted-out dropped');
  perform pg_temp.ok(
    (pg_temp.q('service_role', null, format('select public.ingest_leads(%L, %L, %L)', org_a, camp_a,
      '[{"business_name":"جديد 1","phone_e164":"+201511111111","source":"google_maps","dedupe_key":"ing1"}]'))::jsonb ->> 'new') = '0', 'ingest is idempotent');
  perform pg_temp.ok((select count(*) from public.leads where organization_id = org_a and dedupe_key = 'ing3') = 0, 'opted-out lead never stored');
  perform pg_temp.ok((select count(*) from public.campaign_leads where campaign_id = camp_a) = 5, 'ingested leads linked to campaign (3 + 2 new)');

  -- Fresh leads across campaigns (spec 6.2): by default skip companies the org already has; option to include; cooldown always.
  insert into public.campaigns (organization_id, name, created_by) values (org_a, 'second', a) returning id into camp2;
  select id into l_ing1 from public.leads where organization_id = org_a and dedupe_key = 'ing1';
  select id into l_ing2 from public.leads where organization_id = org_a and dedupe_key = 'ing2';
  -- p1 (lead_a) has a sent message => cooldown; ing1 is known; ing5 is new and fit "maybe"
  res := pg_temp.q('service_role', null, format('select public.ingest_leads(%L, %L, %L)', org_a, camp2,
    '[{"business_name":"قديم","phone_e164":"+201012345678","source":"google_maps","dedupe_key":"p1"},{"business_name":"جديد 1","source":"google_maps","dedupe_key":"ing1"},{"business_name":"جديد 5","phone_e164":"+201511111115","phone_type":"mobile","whatsapp_eligible":true,"source":"google_maps","dedupe_key":"ing5","fit":"maybe","fit_reason":"نشاط قريب"}]'))::jsonb;
  perform pg_temp.ok(res @> '{"cooldown":1,"previously_found":1,"new":1,"newly_linked":1,"already_known":0}'::jsonb, 'default: cooldown + previously found skipped, new kept: ' || res::text);
  perform pg_temp.ok((select fit from public.campaign_leads where campaign_id = camp2) = 'maybe', 'fit maybe stored on the campaign link');
  perform pg_temp.ok((select fit_reason from public.campaign_leads where campaign_id = camp2) = 'نشاط قريب', 'fit reason stored');
  res := pg_temp.q('service_role', null, format('select public.ingest_leads(%L, %L, %L, true)', org_a, camp2,
    '[{"business_name":"جديد 1","source":"google_maps","dedupe_key":"ing1"},{"business_name":"جديد 2","source":"google_maps","dedupe_key":"ing2"},{"business_name":"قديم","phone_e164":"+201012345678","source":"google_maps","dedupe_key":"p1"}]'))::jsonb;
  perform pg_temp.ok(res @> '{"cooldown":1,"previously_found":0,"new":0,"newly_linked":2,"already_known":2}'::jsonb, 'include previous: known leads linked, not charged, cooldown still skipped: ' || res::text);
  perform pg_temp.ok((select count(*) from public.campaign_leads where campaign_id = camp2 and not charged) = 2, 'included leads are not charged again');
  perform pg_temp.ok((select count(*) from public.campaign_leads where campaign_id = camp2) = 3, 'cooldown lead never linked');

  -- Contact cooldown is enforced in the database for every campaign and channel
  insert into public.messages (organization_id, lead_id, campaign_id, channel, generated_text)
    values (org_a, l_ing1, camp_a, 'whatsapp', 'اهلا ing1');
  insert into public.messages (organization_id, lead_id, campaign_id, channel, generated_text)
    values (org_a, l_ing1, camp2, 'whatsapp', 'اهلا ing1 c2') returning id into msg_c2;
  perform pg_temp.q('postgres', null, format('update public.messages set review_status = %L where lead_id = %L', 'approved', l_ing1));
  perform pg_temp.q('postgres', null, $q$select set_config('wasla.sent_rpc', '1', true)$q$);
  perform pg_temp.q('postgres', null, format('update public.messages set review_status = %L, sent_at = now() where lead_id = %L and campaign_id = %L', 'sent', l_ing1, camp_a));
  perform pg_temp.ok(pg_temp.err('postgres', null, format('update public.messages set review_status = %L, sent_at = now() where id = %L', 'sent', msg_c2)) like '%contact_cooldown%', 'second send to the same lead within 30 days is blocked');
  perform pg_temp.ok(pg_temp.err('postgres', null, format('insert into public.messages (organization_id, lead_id, campaign_id, channel, generated_text) values (%L, %L, %L, %L, %L)', org_a, l_ing1, camp2, 'email', 'x')) like '%contact_cooldown%', 'no new message for a lead in cooldown');
  perform pg_temp.q('postgres', null, $q$update public.app_config set value = '0' where key = 'contact_cooldown_days'$q$);
  perform pg_temp.ok(pg_temp.err('postgres', null, format('insert into public.messages (organization_id, lead_id, campaign_id, channel, generated_text) values (%L, %L, %L, %L, %L)', org_a, l_ing1, camp2, 'email', 'x')) = 'OK', 'cooldown length is config (0 days = off)');
  perform pg_temp.q('postgres', null, $q$update public.app_config set value = '30' where key = 'contact_cooldown_days'$q$);

  -- "Not relevant": removes, refunds the charged credits once, teaches, never after a send
  select id into cl_ing2 from public.campaign_leads where campaign_id = camp_a and lead_id = l_ing2;
  select id into cl_a from public.campaign_leads where campaign_id = camp_a and lead_id = lead_a;
  bal0 := pg_temp.q('authenticated', a, format('select public.org_credit_balance(%L)', org_a))::int;
  res := pg_temp.q('authenticated', a, format('select public.mark_not_relevant(%L, %L)', cl_ing2, 'مش بيشتري مننا'))::jsonb;
  perform pg_temp.ok(res = '{"already": false, "refunded": 1}'::jsonb, 'refund 1 credit: ' || res::text);
  perform pg_temp.ok(pg_temp.q('authenticated', a, format('select public.org_credit_balance(%L)', org_a))::int = bal0 + 1, 'balance +1');
  perform pg_temp.ok((pg_temp.q('authenticated', a, format('select public.mark_not_relevant(%L)', cl_ing2))::jsonb) @> '{"already": true}'::jsonb, 'idempotent, no second refund');
  perform pg_temp.ok(pg_temp.q('authenticated', a, format('select public.org_credit_balance(%L)', org_a))::int = bal0 + 1, 'still +1');
  perform pg_temp.ok(pg_temp.err('authenticated', b, format('select public.mark_not_relevant(%L)', cl_ing2)) like 'P0002%', 'B cannot remove A leads');
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('select public.mark_not_relevant(%L)', cl_a)) like '%already_sent%', 'a lead that was messaged cannot be removed');
  perform pg_temp.ok(pg_temp.q('authenticated', a, 'select count(*) from public.negative_examples') = '1', 'negative example stored');
  perform pg_temp.ok(pg_temp.q('authenticated', b, 'select count(*) from public.negative_examples') = '0', 'negative examples are per org');
  perform pg_temp.ok((select count(*) from public.credit_ledger where organization_id = org_a and kind = 'refund' and reason like 'not_relevant:%') = 1, 'one refund row');

  -- Score v2.2: two relevant signals can pass 69; one cannot; maybe caps at 60; removed leads are not scored
  insert into public.lead_signals (organization_id, lead_id, signal_key, normalized, source) values
    (org_a, l_ing1, 'activity', '{"value":1}', 'test'), (org_a, l_ing1, 'unclaimed_listing', '{"value":1}', 'test'), (org_a, l_ing1, 'has_website', '{"value":0}', 'test'),
    (org_a, l_ing2, 'activity', '{"value":1}', 'test');
  perform pg_temp.q('authenticated', a, format('update public.campaigns set parameters = %L where id = %L', '{"signals":[{"key":"activity","weight":40},{"key":"unclaimed_listing","weight":60},{"key":"has_website","weight":-100}]}', camp_a));
  perform pg_temp.q('authenticated', a, format('select public.recompute_campaign_scores(%L)', camp_a));
  perform pg_temp.ok((select opportunity_score from public.campaign_leads where lead_id = l_ing1 and campaign_id = camp_a) = 100, 'two relevant signals can reach 100');
  perform pg_temp.ok((select opportunity_score from public.campaign_leads where lead_id = l_ing2 and campaign_id = camp_a) is null, 'removed (not relevant) leads are not scored');
  perform pg_temp.q('authenticated', a, format('update public.campaigns set parameters = %L where id = %L', '{"signals":[{"key":"activity","weight":40},{"key":"has_website","weight":-100}]}', camp_a));
  perform pg_temp.q('authenticated', a, format('select public.recompute_campaign_scores(%L)', camp_a));
  perform pg_temp.ok((select opportunity_score from public.campaign_leads where lead_id = l_ing1 and campaign_id = camp_a) = 69, 'one relevant signal + baseline website cannot pass 69');
  perform pg_temp.q('authenticated', a, format('update public.campaigns set parameters = %L where id = %L', '{"signals":[{"key":"activity","weight":40},{"key":"has_website","weight":-100,"emphasis":true}]}', camp_a));
  perform pg_temp.q('authenticated', a, format('select public.recompute_campaign_scores(%L)', camp_a));
  perform pg_temp.ok((select opportunity_score from public.campaign_leads where lead_id = l_ing1 and campaign_id = camp_a) = 100, 'planner-emphasized website signal counts fully');
  perform pg_temp.q('postgres', null, format('update public.campaign_leads set fit = %L where lead_id = %L and campaign_id = %L', 'maybe', l_ing1, camp_a));
  perform pg_temp.q('authenticated', a, format('select public.recompute_campaign_scores(%L)', camp_a));
  perform pg_temp.ok((select opportunity_score from public.campaign_leads where lead_id = l_ing1 and campaign_id = camp_a) = 60, 'fit maybe caps at 60');
  perform pg_temp.q('authenticated', a, format('update public.campaigns set parameters = %L where id = %L', '{}', camp_a));

  -- New tables: members read, others do not, nobody writes from the client
  insert into public.lead_insights (organization_id, lead_id, facts, analysis) values (org_a, lead_a, '{"activity_label":"active"}', '{"confidence":"low"}');
  insert into public.search_queries (organization_id, campaign_id, query, area) values (org_a, camp_a, 'شركة تسويق مدينة نصر', 'مدينة نصر');
  perform pg_temp.ok(pg_temp.q('authenticated', a, 'select count(*) from public.lead_insights') = '1', 'A reads lead insights');
  perform pg_temp.ok(pg_temp.q('authenticated', b, 'select count(*) from public.lead_insights') = '0', 'B cannot read A insights');
  perform pg_temp.ok(pg_temp.q('authenticated', a, 'select count(*) from public.search_queries') = '1', 'A reads own past searches');
  perform pg_temp.ok(pg_temp.q('authenticated', b, 'select count(*) from public.search_queries') = '0', 'B cannot read A searches');
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('insert into public.lead_insights (organization_id, lead_id) values (%L, %L)', org_a, lead2)) like '42501%', 'users cannot write insights');
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('insert into public.search_queries (organization_id, query) values (%L, %L)', org_a, 'x')) like '42501%', 'users cannot write searches');
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('insert into public.negative_examples (organization_id, reason) values (%L, %L)', org_a, 'x')) like '42501%', 'users cannot write negative examples directly');
  perform pg_temp.ok(pg_temp.err('anon', null, 'select count(*) from public.lead_insights') like '42501%', 'anon blocked from insights');
  perform pg_temp.ok(pg_temp.q('authenticated', a, 'select count(*) from public.app_config') = '1', 'config readable');
  perform pg_temp.ok(pg_temp.err('authenticated', a, $q$update public.app_config set value = '0'$q$) like '42501%', 'config not writable by users');
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('select public.ingest_leads(%L, %L, %L, true)', org_a, camp_a, '[]')) like '42501%', 'ingest v3 still service-only');

  -- Learning loop: opportunity type is stored per message and aggregated per org
  perform pg_temp.q('postgres', null, format('update public.messages set opportunity_type = %L where id = %L', 'unclaimed_listing', msg));
  perform pg_temp.q('postgres', null, format('update public.leads set status = %L where id = %L', 'replied', lead_a));
  perform pg_temp.ok(pg_temp.q('authenticated', a, format('select sent || %L || replied from public.opportunity_stats(%L)', '/', org_a)) = '1/1', 'opportunity stats: 1 sent, 1 replied');
  perform pg_temp.ok(pg_temp.q('authenticated', b, format('select count(*) from public.opportunity_stats(%L)', org_a)) = '0', 'B cannot read A opportunity stats');

  -- Planner / signal job types
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('select public.create_job(%L, null, %L, 2, %L)', org_a, 'plan', 'plan-1')) = 'OK', 'planner job allowed');
  perform pg_temp.ok(pg_temp.err('authenticated', a, format('select public.create_job(%L, null, %L, 0, %L)', org_a, 'bogus', 'bad-1')) like '23514%', 'unknown job type rejected');

  raise exception 'ALL CHECKS PASSED (rolled back)';
end $$;

