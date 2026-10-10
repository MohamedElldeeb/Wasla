-- A message that still fails validation after the one automatic retry is stored as a visible "failed" row, so the user sees the lead
-- in the review queue with a clear state and a regenerate button instead of the lead silently having no message. Never sendable:
-- only 'approved' can become 'sent' (existing trigger), and a failed row holds no text.
alter table public.messages add column fail_reason text;
alter table public.messages drop constraint messages_review_status_check;
alter table public.messages add constraint messages_review_status_check
  check (review_status in ('pending', 'approved', 'rejected', 'sent', 'failed'));

-- Same as before (lead must exist, no opted-out lead, contact cooldown), but a row created as 'failed' stays 'failed'.
create or replace function public.messages_before_insert()
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
  if public.in_contact_cooldown(new.lead_id) then
    raise exception 'contact_cooldown' using errcode = 'P0001';
  end if;
  if new.review_status is distinct from 'failed' then
    new.review_status := 'pending';
  else
    new.generated_text := '';
  end if;
  return new;
end;
$$;

-- A failed row holds no text, so it can never leave 'failed' for a reviewable state without real text (the regenerate PATCH sets the text and the status together).
create function public.messages_no_empty_text()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.review_status in ('pending', 'approved', 'sent') and btrim(coalesce(new.edited_text, new.generated_text, '')) = '' then
    raise exception 'empty_message' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger messages_no_empty_text before update on public.messages
  for each row execute function public.messages_no_empty_text();
