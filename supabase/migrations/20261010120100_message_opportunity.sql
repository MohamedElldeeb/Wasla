-- Learning loop (spec 6.3b step 7): every message records the opportunity type its angle was built on,
-- so analytics can show reply rate by opportunity type and the planner can prefer what works.

alter table public.messages add column opportunity_type text;
create index messages_opportunity_idx on public.messages (organization_id, opportunity_type) where opportunity_type is not null;

-- Reply rate by opportunity type for one organization (RLS-scoped through is_org_member).
-- "replied" = the lead moved to replied, interested, meeting or won.
create function public.opportunity_stats(p_org uuid)
returns table (opportunity_type text, sent integer, replied integer)
language sql stable security definer set search_path = '' as $$
  select m.opportunity_type,
         count(*)::integer as sent,
         count(*) filter (where l.status in ('replied', 'interested', 'meeting', 'won'))::integer as replied
  from public.messages m
  join public.leads l on l.id = m.lead_id
  where public.is_org_member(p_org)
    and m.organization_id = p_org
    and m.review_status = 'sent'
    and m.opportunity_type is not null
  group by m.opportunity_type
  order by count(*) desc
$$;
revoke all on function public.opportunity_stats(uuid) from public, anon;
grant execute on function public.opportunity_stats(uuid) to authenticated, service_role;
