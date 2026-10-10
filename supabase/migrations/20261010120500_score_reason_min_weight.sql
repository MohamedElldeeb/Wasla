-- Score reasons: a reason whose signal weight is 15 or less in the campaign is not shown, unless it is the only kind of reason the lead has.
-- Same function as before otherwise (scores are unchanged); only the displayed reasons differ. Backward compatible: no table or column changes.
create or replace function public.recompute_campaign_scores(p_campaign uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  org uuid;
  updated integer;
begin
  select organization_id into org from public.campaigns where id = p_campaign;
  if org is null then
    raise exception 'campaign_not_found' using errcode = 'P0002';
  end if;
  if (select auth.uid()) is not null and not public.is_org_member(org) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with cfg as (
    select s ->> 'key' as key, (s ->> 'weight')::numeric as raw_weight,
           coalesce((s ->> 'emphasis') = 'true', false) as emphasis
    from public.campaigns c,
         jsonb_array_elements(coalesce(c.parameters -> 'signals', '[]'::jsonb)) s
    where c.id = p_campaign
      and s ->> 'key' is not null
      and (s ->> 'weight') ~ '^-?[0-9]+(\.[0-9]+)?$'
      and (s ->> 'weight')::numeric <> 0
  ),
  vals as (
    select cl.id as cl_id, cl.fit, cfg.key,
           case when sd.baseline and not cfg.emphasis then sign(cfg.raw_weight) * least(abs(cfg.raw_weight), 25) else cfg.raw_weight end as weight,
           (sd.baseline and not cfg.emphasis) as is_baseline,
           abs(cfg.raw_weight) as campaign_weight,
           greatest(0, least(1, (ls.normalized ->> 'value')::numeric)) as nv,
           ls.normalized ->> 'label_ar' as custom_label,
           sd.reason_low_ar, sd.reason_high_ar
    from public.campaign_leads cl
    join cfg on true
    join public.lead_signals ls on ls.lead_id = cl.lead_id and ls.signal_key = cfg.key
    join public.signal_definitions sd on sd.key = cfg.key
    where cl.campaign_id = p_campaign and cl.removed_at is null
  ),
  contrib as (
    select cl_id, fit, key, weight, nv, custom_label, is_baseline, campaign_weight,
           weight * nv - least(weight, 0) as c,
           (weight > 0 and nv >= 0.66) or (weight < 0 and nv <= 0.34) as fav,
           case
             when weight > 0 and nv >= 0.66 then coalesce(custom_label, reason_high_ar)
             when weight < 0 and nv <= 0.34 then reason_low_ar
           end as reason,
           case
             when weight > 0 and nv >= 0.66 then 'high'
             when weight < 0 and nv <= 0.34 then 'low'
           end as side
    from vals
  ),
  scores as (
    select cl_id,
           least(
             least(round(100 * sum(c) / nullif(sum(abs(weight)), 0)),
                   case when count(*) filter (where fav and not is_baseline) < 2 then 69 else 100 end),
             case when max(fit) = 'maybe' then 60 else 100 end)::smallint as score
    from contrib group by cl_id
  ),
  ranked as (
    select cl_id, key, side, reason, custom_label, c,
           row_number() over (partition by cl_id order by c desc, reason) as rn
    from (
      select *, bool_or(campaign_weight > 15) over (partition by cl_id) as any_big
      from contrib where reason is not null and c > 0
    ) r
    -- a reason whose signal weighs 15 or less in this campaign says little ("has a website"): hide it unless nothing stronger exists
    where campaign_weight > 15 or not any_big
  ),
  reasons as (
    select cl_id,
           jsonb_agg(reason order by rn) as reasons,
           jsonb_agg(
             case when side = 'high' and custom_label is not null
                  then jsonb_build_object('k', key, 's', side, 'label', custom_label)
                  else jsonb_build_object('k', key, 's', side) end
             order by rn) as keys
    from ranked where rn <= 3 group by cl_id
  ),
  upd as (
    update public.campaign_leads cl
    set opportunity_score = s.score,
        score_reasons = coalesce(r.reasons, '[]'::jsonb),
        score_reason_keys = coalesce(r.keys, '[]'::jsonb),
        scored_at = now()
    from public.campaign_leads x
    left join scores s on s.cl_id = x.id
    left join reasons r on r.cl_id = x.id
    where cl.id = x.id and x.campaign_id = p_campaign and x.removed_at is null
    returning 1
  )
  select count(*) into updated from upd;
  return updated;
end;
$$;
revoke all on function public.recompute_campaign_scores(uuid) from public, anon;
grant execute on function public.recompute_campaign_scores(uuid) to authenticated, service_role;
