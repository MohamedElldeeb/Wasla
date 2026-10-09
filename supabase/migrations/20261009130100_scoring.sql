-- Opportunity score: weighted sum of normalized signals using the CAMPAIGN weights.
--   weights are signed: w > 0 rewards a high normalized value, w < 0 rewards a low one.
--   contribution_i = w_i * n_i - min(w_i, 0)  (0 .. |w_i|)
--   score = round(100 * sum(contribution_i) / sum(|w_i|)) over the signals collected for that lead
-- Signals not collected for a lead are ignored (unknown is neither good nor bad).
-- Reasons: up to 3 short Arabic reasons from the strongest favorable contributions.

create function public.recompute_campaign_scores(p_campaign uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  org uuid;
  n integer;
begin
  select organization_id into org from public.campaigns where id = p_campaign;
  if org is null then
    raise exception 'campaign_not_found' using errcode = 'P0002';
  end if;
  if (select auth.uid()) is not null and not public.is_org_member(org) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with cfg as (
    select s ->> 'key' as key, (s ->> 'weight')::numeric as weight
    from public.campaigns c,
         jsonb_array_elements(coalesce(c.parameters -> 'signals', '[]'::jsonb)) s
    where c.id = p_campaign
      and s ->> 'key' is not null
      and (s ->> 'weight') ~ '^-?[0-9]+(\.[0-9]+)?$'
      and (s ->> 'weight')::numeric <> 0
  ),
  vals as (
    select cl.id as cl_id, cfg.weight,
           greatest(0, least(1, (ls.normalized ->> 'value')::numeric)) as n,
           ls.normalized ->> 'label_ar' as custom_label,
           sd.reason_low_ar, sd.reason_high_ar
    from public.campaign_leads cl
    join cfg on true
    join public.lead_signals ls on ls.lead_id = cl.lead_id and ls.signal_key = cfg.key
    join public.signal_definitions sd on sd.key = cfg.key
    where cl.campaign_id = p_campaign
  ),
  contrib as (
    select cl_id, weight, n,
           weight * n - least(weight, 0) as c,
           case
             when weight > 0 and n >= 0.66 then coalesce(custom_label, reason_high_ar)
             when weight < 0 and n <= 0.34 then reason_low_ar
           end as reason
    from vals
  ),
  scores as (
    select cl_id,
           round(100 * sum(c) / nullif(sum(abs(weight)), 0))::smallint as score
    from contrib group by cl_id
  ),
  ranked as (
    select cl_id, reason, c,
           row_number() over (partition by cl_id order by c desc, reason) as rn
    from contrib where reason is not null and c > 0
  ),
  reasons as (
    select cl_id, jsonb_agg(reason order by rn) as reasons
    from ranked where rn <= 3 group by cl_id
  ),
  upd as (
    update public.campaign_leads cl
    set opportunity_score = s.score,
        score_reasons = coalesce(r.reasons, '[]'::jsonb),
        scored_at = now()
    from public.campaign_leads x
    left join scores s on s.cl_id = x.id
    left join reasons r on r.cl_id = x.id
    where cl.id = x.id and x.campaign_id = p_campaign
    returning 1
  )
  select count(*) into n from upd;
  return n;
end;
$$;
revoke all on function public.recompute_campaign_scores(uuid) from public, anon;
grant execute on function public.recompute_campaign_scores(uuid) to authenticated, service_role;

-- Paid credits per lead for a set of campaign signals ([{key, weight}, ...]).
-- Signals sharing a cost_group (one actor run) are charged once; disabled signals are ignored.
create function public.signal_credits_per_lead(p_signals jsonb)
returns integer language sql stable set search_path = '' as $$
  select coalesce(sum(g.cost), 0)::integer
  from (
    select coalesce(sd.cost_group, sd.key) as grp, max(sd.credit_cost) as cost
    from jsonb_array_elements(coalesce(p_signals, '[]'::jsonb)) s
    join public.signal_definitions sd on sd.key = s ->> 'key' and sd.enabled
    group by 1
  ) g
$$;
revoke all on function public.signal_credits_per_lead(jsonb) from public, anon;
grant execute on function public.signal_credits_per_lead(jsonb) to authenticated, service_role;
