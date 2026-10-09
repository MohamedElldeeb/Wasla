-- Identity and tenancy: profiles, organizations, memberships, invitations.

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  logo_url text,
  offer_profile jsonb not null default '{}'::jsonb,
  wa_daily_cap integer not null default 30 check (wa_daily_cap between 1 and 500), -- PROPOSED default, OPEN decision #6
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index memberships_user_id_idx on public.memberships (user_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  token_hash text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index invitations_organization_id_idx on public.invitations (organization_id);
create index invitations_invited_by_idx on public.invitations (invited_by);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger memberships_updated_at before update on public.memberships
  for each row execute function public.set_updated_at();
create trigger invitations_updated_at before update on public.invitations
  for each row execute function public.set_updated_at();

-- Helper functions (SECURITY DEFINER, fixed search_path).
create function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select p.is_platform_admin from public.profiles p where p.user_id = (select auth.uid())),
    false)
$$;

create function public.is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = (select auth.uid()))
$$;

create function public.is_org_owner(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = (select auth.uid()) and m.role = 'owner')
$$;

create function public.shares_org_with(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.memberships a
    join public.memberships b on a.organization_id = b.organization_id
    where a.user_id = (select auth.uid()) and b.user_id = other)
$$;

revoke all on function public.is_platform_admin() from public, anon;
revoke all on function public.is_org_member(uuid) from public, anon;
revoke all on function public.is_org_owner(uuid) from public, anon;
revoke all on function public.shares_org_with(uuid) from public, anon;
grant execute on function public.is_platform_admin() to authenticated, service_role;
grant execute on function public.is_org_member(uuid) to authenticated, service_role;
grant execute on function public.is_org_owner(uuid) to authenticated, service_role;
grant execute on function public.shares_org_with(uuid) to authenticated, service_role;

-- Auto-create a profile for each new auth user.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Never let an org lose its last owner (direct deletes/demotions only).
create function public.guard_last_owner()
returns trigger language plpgsql set search_path = '' as $$
begin
  if pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then return old; end if; return new; -- cascade
  end if;
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner') then
    if not exists (
      select 1 from public.memberships m
      where m.organization_id = old.organization_id and m.role = 'owner' and m.id <> old.id) then
      raise exception 'last_owner' using errcode = 'P0001';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger memberships_guard_last_owner
  before update of role or delete on public.memberships
  for each row execute function public.guard_last_owner();

-- RLS
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;

revoke all on public.profiles, public.organizations, public.memberships, public.invitations
  from anon, authenticated;
grant select on public.profiles, public.organizations, public.memberships, public.invitations to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant update (name, logo_url, offer_profile, wa_daily_cap) on public.organizations to authenticated;
grant update (role) on public.memberships to authenticated;
grant delete on public.memberships to authenticated;
grant insert, delete on public.invitations to authenticated;

create policy profiles_select on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) or public.shares_org_with(user_id));
create policy profiles_update_self on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy organizations_select on public.organizations for select to authenticated
  using (public.is_org_member(id));
create policy organizations_update_owner on public.organizations for update to authenticated
  using (public.is_org_owner(id)) with check (public.is_org_owner(id));

create policy memberships_select on public.memberships for select to authenticated
  using (public.is_org_member(organization_id));
create policy memberships_update_owner on public.memberships for update to authenticated
  using (public.is_org_owner(organization_id)) with check (public.is_org_owner(organization_id));
create policy memberships_delete_owner on public.memberships for delete to authenticated
  using (public.is_org_owner(organization_id));

create policy invitations_select_owner on public.invitations for select to authenticated
  using (public.is_org_owner(organization_id));
create policy invitations_insert_owner on public.invitations for insert to authenticated
  with check (public.is_org_owner(organization_id) and invited_by = (select auth.uid()));
create policy invitations_delete_owner on public.invitations for delete to authenticated
  using (public.is_org_owner(organization_id));
