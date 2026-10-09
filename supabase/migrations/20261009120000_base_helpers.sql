-- Base helpers shared by every table.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Cairo calendar day, used for daily caps and counters.
create or replace function public.cairo_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Africa/Cairo')::date
$$;
