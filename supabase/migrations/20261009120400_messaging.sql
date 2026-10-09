-- Messages, lead events, opt-outs, daily send counters, send/undo RPCs, stats.

create table public.opt_outs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  phone_e164 text,
  email text,
  reason text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opt_outs_has_contact check (phone_e164 is not null or email is not null)
);
create unique index opt_outs_org_phone_unique on public.opt_outs (organization_id, phone_e164) where phone_e164 is not null;
create unique index opt_outs_org_email_unique on public.opt_outs (organization_id, email) where email is not null;
create index opt_outs_created_by_idx on public.opt_outs (created_by);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  channel text not null check (channel in ('whatsapp', 'messenger', 'email')),
  subject text,
  generated_text text not null,
  edited_text text,
  angle text,
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected', 'sent')),
  regen_count integer not null default 0,
  sent_at timestamptz,
  sent_by uuid references auth.users (id) on delete set null,
  llm_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, campaign_id, channel)
);
create index messages_org_status_idx on public.messages (organization_id, review_status);
create index messages_campaign_idx on public.messages (campaign_id);
create index messages_lead_idx on public.messages (lead_id);
create index messages_job_idx on public.messages (job_id);
create index messages_sent_by_idx on public.messages (sent_by);

create table public.lead_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  type text not null check (type in ('status_change', 'note', 'reply_received')),
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lead_events_lead_idx on public.lead_events (lead_id, created_at desc);
create index lead_events_org_idx on public.lead_events (organization_id);
create index lead_events_created_by_idx on public.lead_events (created_by);

create table public.daily_send_counters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'messenger', 'email')),
  day date not null,
  count integer not null default 0 check (count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, channel, day)
);

create trigger opt_outs_updated_at before update on public.opt_outs
  for each row execute function public.set_updated_at();
create trigger messages_updated_at before update on public.messages
  for each row execute function public.set_updated_at();
create trigger lead_events_updated_at before update on public.lead_events
  for each row execute function public.set_updated_at();
create trigger daily_send_counters_updated_at before update on public.daily_send_counters
  for each row execute function public.set_updated_at();

-- Opt-out check. Service role (n8n) and org members only.
create function public.is_opted_out(p_org uuid, p_phone text, p_email text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not public.is_org_member(p_org) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return exists (
    select 1 from public.opt_outs o
    where o.organization_id = p_org
      and ((p_phone is not null and o.phone_e164 = p_phone)
        or (p_email is not null and o.email = lower(p_email))));
end;
$$;
revoke all on function public.is_opted_out(uuid, text, text) from public, anon;
grant execute on function public.is_opted_out(uuid, text, text) to authenticated, service_role;

-- Opt-out inserts: normalize email, flag matching leads, reject their open messages.
create function public.opt_outs_before_insert()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.email := nullif(lower(btrim(new.email)), '');
  return new;
end;
$$;
create trigger opt_outs_normalize before insert on public.opt_outs
  for each row execute function public.opt_outs_before_insert();

create function public.opt_outs_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.leads l set status = 'opted_out'
  where l.organization_id = new.organization_id
    and ((new.phone_e164 is not null and l.phone_e164 = new.phone_e164)
      or (new.email is not null and lower(l.email) = new.email));

  update public.messages m set review_status = 'rejected'
  from public.leads l
  where m.lead_id = l.id
    and m.organization_id = new.organization_id
    and m.review_status in ('pending', 'approved')
    and ((new.phone_e164 is not null and l.phone_e164 = new.phone_e164)
      or (new.email is not null and lower(l.email) = new.email));
  return new;
end;
$$;
revoke all on function public.opt_outs_after_insert() from public, anon, authenticated;
create trigger opt_outs_apply after insert on public.opt_outs
  for each row execute function public.opt_outs_after_insert();

-- Messages: no generation for opted-out leads; strict status transitions.
create function public.messages_before_insert()
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
  new.review_status := 'pending';
  return new;
end;
$$;
create trigger messages_guard_insert before insert on public.messages
  for each row execute function public.messages_before_insert();

create function public.messages_before_update()
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
create trigger messages_guard_update before update on public.messages
  for each row execute function public.messages_before_update();

-- Cap check: true while today's WhatsApp count is below the org cap (Cairo day).
create function public.can_send_whatsapp(org uuid)
returns boolean language sql stable set search_path = '' as $$
  select coalesce((
    select c.count from public.daily_send_counters c
    where c.organization_id = org and c.channel = 'whatsapp' and c.day = public.cairo_today()), 0)
    < (select o.wa_daily_cap from public.organizations o where o.id = org)
$$;
revoke all on function public.can_send_whatsapp(uuid) from public, anon;
grant execute on function public.can_send_whatsapp(uuid) to authenticated, service_role;

-- Mark a reviewed message as sent (user tapped the WhatsApp/Messenger action).
create function public.mark_message_sent(p_message_id uuid)
returns public.messages language plpgsql security definer set search_path = '' as $$
declare
  m public.messages;
  l public.leads;
  used integer;
begin
  select * into m from public.messages where id = p_message_id for update;
  if not found or not public.is_org_member(m.organization_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if m.review_status = 'sent' then
    return m;
  end if;
  if m.review_status <> 'approved' then
    raise exception 'not_approved' using errcode = 'P0001';
  end if;
  select * into l from public.leads where id = m.lead_id;
  if public.is_opted_out(m.organization_id, l.phone_e164, l.email) then
    raise exception 'opted_out' using errcode = 'P0001';
  end if;

  if m.channel = 'whatsapp' then
    if not l.whatsapp_eligible then
      raise exception 'not_whatsapp_eligible' using errcode = 'P0001';
    end if;
    insert into public.daily_send_counters (organization_id, channel, day, count)
    values (m.organization_id, 'whatsapp', public.cairo_today(), 0)
    on conflict (organization_id, channel, day) do nothing;
    update public.daily_send_counters c set count = c.count + 1
    where c.organization_id = m.organization_id and c.channel = 'whatsapp' and c.day = public.cairo_today()
      and c.count < (select o.wa_daily_cap from public.organizations o where o.id = m.organization_id)
    returning c.count into used;
    if used is null then
      raise exception 'daily_cap_reached' using errcode = 'P0001';
    end if;
  end if;

  perform set_config('wasla.sent_rpc', '1', true);
  update public.messages set review_status = 'sent', sent_at = now(), sent_by = (select auth.uid())
  where id = m.id returning * into m;
  update public.leads set status = 'contacted' where id = l.id and status = 'new';
  return m;
end;
$$;
revoke all on function public.mark_message_sent(uuid) from public, anon;
grant execute on function public.mark_message_sent(uuid) to authenticated;

-- Undo within a short grace window (PROPOSED: 15s; UI shows 10s).
create function public.undo_message_sent(p_message_id uuid)
returns public.messages language plpgsql security definer set search_path = '' as $$
declare m public.messages;
begin
  select * into m from public.messages where id = p_message_id for update;
  if not found or not public.is_org_member(m.organization_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if m.review_status <> 'sent' then
    return m;
  end if;
  if m.sent_at < now() - interval '15 seconds' then
    raise exception 'undo_window_passed' using errcode = 'P0001';
  end if;

  if m.channel = 'whatsapp' then
    update public.daily_send_counters c set count = greatest(c.count - 1, 0)
    where c.organization_id = m.organization_id and c.channel = 'whatsapp' and c.day = public.cairo_today();
  end if;

  perform set_config('wasla.sent_rpc', '1', true);
  update public.messages set review_status = 'approved', sent_at = null, sent_by = null
  where id = m.id returning * into m;
  update public.leads l set status = 'new'
  where l.id = m.lead_id and l.status = 'contacted'
    and not exists (select 1 from public.messages x where x.lead_id = l.id and x.review_status = 'sent');
  return m;
end;
$$;
revoke all on function public.undo_message_sent(uuid) from public, anon;
grant execute on function public.undo_message_sent(uuid) to authenticated;

create function public.campaign_stats(p_campaign uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'leads', (select count(*) from public.campaign_leads cl where cl.campaign_id = p_campaign),
    'whatsapp_eligible', (select count(*) from public.campaign_leads cl
       join public.leads l on l.id = cl.lead_id where cl.campaign_id = p_campaign and l.whatsapp_eligible),
    'messages_generated', (select count(*) from public.messages m where m.campaign_id = p_campaign),
    'approved', (select count(*) from public.messages m where m.campaign_id = p_campaign and m.review_status = 'approved'),
    'rejected', (select count(*) from public.messages m where m.campaign_id = p_campaign and m.review_status = 'rejected'),
    'sent', (select count(*) from public.messages m where m.campaign_id = p_campaign and m.review_status = 'sent'),
    'replied', (select count(*) from public.campaign_leads cl join public.leads l on l.id = cl.lead_id
       where cl.campaign_id = p_campaign and l.status = 'replied'),
    'interested', (select count(*) from public.campaign_leads cl join public.leads l on l.id = cl.lead_id
       where cl.campaign_id = p_campaign and l.status = 'interested'),
    'meetings', (select count(*) from public.campaign_leads cl join public.leads l on l.id = cl.lead_id
       where cl.campaign_id = p_campaign and l.status = 'meeting'),
    'won', (select count(*) from public.campaign_leads cl join public.leads l on l.id = cl.lead_id
       where cl.campaign_id = p_campaign and l.status = 'won'),
    'credits_used', (select coalesce(sum(j.credits_used), 0) from public.jobs j where j.campaign_id = p_campaign),
    'cost_usd', (select coalesce(sum(j.cost_usd), 0) from public.jobs j where j.campaign_id = p_campaign))
$$;
revoke all on function public.campaign_stats(uuid) from public, anon;
grant execute on function public.campaign_stats(uuid) to authenticated, service_role;

-- RLS
alter table public.opt_outs enable row level security;
alter table public.messages enable row level security;
alter table public.lead_events enable row level security;
alter table public.daily_send_counters enable row level security;
revoke all on public.opt_outs, public.messages, public.lead_events, public.daily_send_counters from anon, authenticated;
grant select, insert on public.opt_outs to authenticated;
grant delete on public.opt_outs to authenticated;
grant select on public.messages, public.daily_send_counters to authenticated;
grant update (edited_text, review_status) on public.messages to authenticated;
grant select, insert on public.lead_events to authenticated;

create policy opt_outs_select on public.opt_outs for select to authenticated
  using (public.is_org_member(organization_id));
create policy opt_outs_insert on public.opt_outs for insert to authenticated
  with check (public.is_org_member(organization_id) and created_by = (select auth.uid()));
create policy opt_outs_delete_owner on public.opt_outs for delete to authenticated
  using (public.is_org_owner(organization_id));

create policy messages_select on public.messages for select to authenticated
  using (public.is_org_member(organization_id));
create policy messages_update on public.messages for update to authenticated
  using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy lead_events_select on public.lead_events for select to authenticated
  using (public.is_org_member(organization_id));
create policy lead_events_insert on public.lead_events for insert to authenticated
  with check (public.is_org_member(organization_id) and created_by = (select auth.uid()));

create policy daily_send_counters_select on public.daily_send_counters for select to authenticated
  using (public.is_org_member(organization_id));
