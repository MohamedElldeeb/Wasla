-- The user can switch the angle a message will be built on (spec 6.3b step 4). Only an opportunity the lead really has can be selected.
create function public.set_selected_opportunity(p_campaign_lead uuid, p_type text)
returns void language plpgsql security definer set search_path = '' as $$
declare cl public.campaign_leads;
begin
  select * into cl from public.campaign_leads where id = p_campaign_lead for update;
  if not found or not public.is_org_member(cl.organization_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if p_type is not null and not exists (select 1 from jsonb_array_elements(cl.opportunities) o where o ->> 'type' = p_type) then
    raise exception 'unknown_opportunity' using errcode = 'P0001';
  end if;
  update public.campaign_leads set selected_opportunity = p_type where id = cl.id;
end;
$$;
revoke all on function public.set_selected_opportunity(uuid, text) from public, anon;
grant execute on function public.set_selected_opportunity(uuid, text) to authenticated;
