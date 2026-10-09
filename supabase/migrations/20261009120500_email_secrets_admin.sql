-- Email engine tables (used from Phase 3), per-org secret references, admin audit log.

create table public.email_mailboxes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  provider text not null check (provider in ('gmail', 'smtp')),
  from_address text not null,
  daily_cap integer not null default 30 check (daily_cap between 1 and 500), -- PROPOSED
  credentials_ref uuid, -- Supabase Vault secret id; never plaintext
  status text not null default 'pending' check (status in ('pending', 'active', 'error', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, from_address)
);

create table public.email_sequences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index email_sequences_org_idx on public.email_sequences (organization_id);
create index email_sequences_campaign_idx on public.email_sequences (campaign_id);

create table public.sequence_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sequence_id uuid not null references public.email_sequences (id) on delete cascade,
  step_number integer not null check (step_number >= 1),
  delay_days integer not null default 0 check (delay_days >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sequence_id, step_number)
);
create index sequence_steps_org_idx on public.sequence_steps (organization_id);

create table public.email_sends (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  step_id uuid references public.sequence_steps (id) on delete set null,
  mailbox_id uuid references public.email_mailboxes (id) on delete set null,
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'sent', 'bounced', 'replied', 'stopped')),
  provider_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index email_sends_org_idx on public.email_sends (organization_id);
create index email_sends_message_idx on public.email_sends (message_id);
create index email_sends_step_idx on public.email_sends (step_id);
create index email_sends_mailbox_idx on public.email_sends (mailbox_id);
create index email_sends_due_idx on public.email_sends (scheduled_at) where status = 'scheduled';

-- Per-org third-party keys (e.g. Apollo). Holds a Vault secret id only. Service role access only.
create table public.org_secrets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  provider text not null,
  vault_secret_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

-- Audit trail for platform-admin actions (plan activation, suspension, ...). Service role only.
create table public.admin_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete set null,
  admin_id uuid references auth.users (id) on delete set null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_events_org_idx on public.admin_events (organization_id);
create index admin_events_admin_idx on public.admin_events (admin_id);

create trigger email_mailboxes_updated_at before update on public.email_mailboxes
  for each row execute function public.set_updated_at();
create trigger email_sequences_updated_at before update on public.email_sequences
  for each row execute function public.set_updated_at();
create trigger sequence_steps_updated_at before update on public.sequence_steps
  for each row execute function public.set_updated_at();
create trigger email_sends_updated_at before update on public.email_sends
  for each row execute function public.set_updated_at();
create trigger org_secrets_updated_at before update on public.org_secrets
  for each row execute function public.set_updated_at();

alter table public.email_mailboxes enable row level security;
alter table public.email_sequences enable row level security;
alter table public.sequence_steps enable row level security;
alter table public.email_sends enable row level security;
alter table public.org_secrets enable row level security;
alter table public.admin_events enable row level security;

revoke all on public.email_mailboxes, public.email_sequences, public.sequence_steps,
  public.email_sends, public.org_secrets, public.admin_events from anon, authenticated;

grant select, insert, update, delete on public.email_mailboxes to authenticated;
grant select, insert, update, delete on public.email_sequences, public.sequence_steps to authenticated;
grant select on public.email_sends to authenticated;
-- email_mailboxes: credentials_ref is never exposed to clients.
revoke select on public.email_mailboxes from authenticated;
grant select (id, organization_id, provider, from_address, daily_cap, status, created_at, updated_at)
  on public.email_mailboxes to authenticated;

create policy email_mailboxes_select on public.email_mailboxes for select to authenticated
  using (public.is_org_member(organization_id));
create policy email_mailboxes_insert on public.email_mailboxes for insert to authenticated
  with check (public.is_org_owner(organization_id));
create policy email_mailboxes_update on public.email_mailboxes for update to authenticated
  using (public.is_org_owner(organization_id)) with check (public.is_org_owner(organization_id));
create policy email_mailboxes_delete on public.email_mailboxes for delete to authenticated
  using (public.is_org_owner(organization_id));

create policy email_sequences_all on public.email_sequences for all to authenticated
  using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy sequence_steps_all on public.sequence_steps for all to authenticated
  using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy email_sends_select on public.email_sends for select to authenticated
  using (public.is_org_member(organization_id));
-- org_secrets and admin_events: no policies on purpose (service role only).
