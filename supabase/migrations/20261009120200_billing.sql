-- Plans, subscriptions, append-only credit ledger, org bootstrap.

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('free', 'starter', 'growth')),
  name_ar text not null,
  monthly_credits integer not null check (monthly_credits >= 0), -- PROPOSED
  seats integer not null check (seats >= 1),                      -- PROPOSED
  channels jsonb not null default '[]'::jsonb,
  price_egp integer,                                              -- OPEN: NULL until decided
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  plan_code text not null references public.plans (code),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  activated_by uuid references auth.users (id) on delete set null,
  status text not null default 'active' check (status in ('pending', 'active', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index subscriptions_one_active_per_org on public.subscriptions (organization_id) where status = 'active';
create index subscriptions_plan_code_idx on public.subscriptions (plan_code);
create index subscriptions_activated_by_idx on public.subscriptions (activated_by);

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  amount integer not null,
  kind text not null check (kind in ('grant', 'reserve', 'settle', 'refund', 'adjust')),
  job_id uuid, -- FK added with the jobs table
  reason text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index credit_ledger_org_created_idx on public.credit_ledger (organization_id, created_at desc);
create index credit_ledger_created_by_idx on public.credit_ledger (created_by);
-- A job can reserve, settle, and refund at most once each: re-running never double charges.
create unique index credit_ledger_job_kind_unique on public.credit_ledger (job_id, kind)
  where job_id is not null and kind in ('reserve', 'settle', 'refund');

create trigger plans_updated_at before update on public.plans
  for each row execute function public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Append-only: block UPDATE always, DELETE unless it is a cascade from org deletion.
create function public.credit_ledger_append_only()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  raise exception 'credit_ledger is append-only' using errcode = 'P0001';
end;
$$;
create trigger credit_ledger_no_update before update on public.credit_ledger
  for each row execute function public.credit_ledger_append_only();
create trigger credit_ledger_no_delete before delete on public.credit_ledger
  for each row execute function public.credit_ledger_append_only();

-- Balance is always derived. Security invoker: RLS limits the sum to the caller's orgs.
create function public.org_credit_balance(org uuid)
returns bigint language sql stable set search_path = '' as $$
  select coalesce(sum(amount), 0)::bigint from public.credit_ledger where organization_id = org
$$;
revoke all on function public.org_credit_balance(uuid) from public, anon;
grant execute on function public.org_credit_balance(uuid) to authenticated, service_role;

-- Create an org for the calling user: org + owner membership + free plan + initial grant.
-- The initial free grant is given only for the user's first organization (abuse guard).
create function public.create_organization(p_name text, p_offer_profile jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  org_id uuid;
  first_org boolean;
  free_credits integer;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if (select count(*) from public.memberships where user_id = uid and role = 'owner') >= 3 then
    raise exception 'org_limit_reached' using errcode = 'P0001'; -- PROPOSED limit
  end if;
  first_org := not exists (select 1 from public.memberships where user_id = uid);

  insert into public.organizations (name, offer_profile)
  values (p_name, coalesce(p_offer_profile, '{}'::jsonb))
  returning id into org_id;

  insert into public.memberships (organization_id, user_id, role) values (org_id, uid, 'owner');

  insert into public.subscriptions (organization_id, plan_code, ends_at, status)
  values (org_id, 'free', now() + interval '1 month', 'active');

  if first_org then
    select monthly_credits into free_credits from public.plans where code = 'free';
    if free_credits > 0 then
      insert into public.credit_ledger (organization_id, amount, kind, reason, created_by)
      values (org_id, free_credits, 'grant', 'free_plan_initial_grant', uid);
    end if;
  end if;
  return org_id;
end;
$$;
revoke all on function public.create_organization(text, jsonb) from public, anon;
grant execute on function public.create_organization(text, jsonb) to authenticated;

alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.credit_ledger enable row level security;
revoke all on public.plans, public.subscriptions, public.credit_ledger from anon, authenticated;
grant select on public.plans, public.subscriptions, public.credit_ledger to authenticated;

create policy plans_select on public.plans for select to authenticated using (true);
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (public.is_org_member(organization_id));
create policy credit_ledger_select on public.credit_ledger for select to authenticated
  using (public.is_org_member(organization_id));

-- Seed (PROPOSED values; prices are OPEN and stay NULL).
insert into public.plans (code, name_ar, monthly_credits, seats, channels, price_egp) values
  ('free',    'مجانية',  50,   1, '["whatsapp"]',                       null),
  ('starter', 'ستارتر', 1000, 2, '["whatsapp","messenger"]',           null),
  ('growth',  'جروث',   4000, 5, '["whatsapp","messenger","email"]',   null);
