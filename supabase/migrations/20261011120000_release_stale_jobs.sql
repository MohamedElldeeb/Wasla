-- Credits never stay reserved after a start that did not complete: a job still 'queued' after 3 minutes (its webhook was never
-- called or never answered) or 'running' for over 60 minutes with no result is failed and its reservation is released.
-- Additive: one new function, and create_job calls it before checking the balance (same signature and behavior otherwise).
create function public.release_stale_jobs(p_org uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  j record;
  n integer := 0;
begin
  for j in
    select id, status from public.jobs
    where (p_org is null or organization_id = p_org)
      and ((status = 'queued' and created_at < now() - interval '3 minutes')
        or (status = 'running' and coalesce(started_at, created_at) < now() - interval '60 minutes'))
  loop
    perform public.settle_job(j.id, 0, 'failed', case when j.status = 'queued' then 'start_failed' else 'timed_out' end);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.release_stale_jobs(uuid) from public, anon, authenticated;
grant execute on function public.release_stale_jobs(uuid) to service_role;

create or replace function public.create_job(
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

  -- Reservations of starts that never completed are given back before the balance is checked.
  perform public.release_stale_jobs(p_org);

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
