-- Localizable score reasons: keep the Arabic text (used in LLM prompts) and add machine keys so the UI can
-- show each reason in the user's language. Also switch stored Arabic copy to simple Modern Standard Arabic.

alter table public.campaign_leads
  add column score_reason_keys jsonb not null default '[]'::jsonb check (jsonb_typeof(score_reason_keys) = 'array');

update public.signal_definitions set
  name_ar = v.name_ar, description_ar = v.description_ar, reason_low_ar = v.low_ar, reason_high_ar = v.high_ar
from (values
  ('review_insights', 'مضمون التقييمات', 'ملخص للمدح والشكاوى المتكررة في آخر ١٠ تقييمات.', 'التقييمات إيجابية في معظمها', 'التقييمات تتضمن شكاوى'),
  ('business_age', 'عمر النشاط', 'هل يبدو النشاط جديدًا أم قديمًا (تقدير من وتيرة التقييمات).', 'نشاط قديم ومستقر', 'يبدو نشاطًا جديدًا'),
  ('size_proxy', 'حجم النشاط', 'عدد التقييمات ومستواها وعدد الفروع.', 'نشاط صغير', 'نشاط كبير أو متعدد الفروع'),
  ('has_website', 'الموقع الإلكتروني', 'هل لدى النشاط موقع إلكتروني.', 'لا يملك موقعًا إلكترونيًا', 'يملك موقعًا إلكترونيًا'),
  ('website_contacts', 'بيانات التواصل في الموقع', 'بريد إلكتروني وروابط تواصل من الموقع.', 'لا توجد بيانات تواصل ظاهرة', 'بيانات التواصل ظاهرة'),
  ('instagram_activity', 'نشاط إنستجرام', 'المتابعون وعدد المنشورات وتاريخ آخر منشور.', 'آخر منشور قديم', 'نشط على إنستجرام'),
  ('facebook_page', 'صفحة فيسبوك', 'وجود الصفحة وحجم متابعيها.', 'ليس لديه صفحة فيسبوك', 'لديه صفحة فيسبوك نشطة'),
  ('running_ads', 'الإعلانات الجارية', 'إعلانات نشطة في مكتبة إعلانات ميتا.', 'لا يعلن حاليًا', 'يعلن حاليًا'),
  ('decision_maker', 'صاحب القرار', 'اسم المالك أو المدير ووظيفته.', 'صاحب القرار غير معروف', 'صاحب القرار معروف')
) as v(key, name_ar, description_ar, low_ar, high_ar)
where signal_definitions.key = v.key;

update public.campaign_templates set name_ar = 'وكالة تسويق تستهدف المطاعم', offer_text = 'نساعد المطاعم على زيادة الطلبات عبر وسائل التواصل الاجتماعي والإعلانات الممولة.' where code = 'agency_restaurants';
update public.campaign_templates set name_ar = 'وكالة تسويق تستهدف العيادات', offer_text = 'نساعد العيادات على زيادة الحجوزات عبر جوجل ووسائل التواصل الاجتماعي.' where code = 'agency_clinics';
update public.campaign_templates set name_ar = 'مورّد تغليف يستهدف المقاهي', offer_text = 'نوفّر علب وأكواب تغليف بشعار المقهى بكميات مناسبة وسعر جيد.' where code = 'packaging_cafes';
update public.campaign_templates set name_ar = 'مكتب محاسبة يستهدف الشركات الصغيرة', offer_text = 'متابعة الضرائب والفاتورة الإلكترونية والدفاتر للشركات الصغيرة دون غرامات أو تعقيد.' where code = 'accounting_smes';

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
    select s ->> 'key' as key, (s ->> 'weight')::numeric as weight
    from public.campaigns c,
         jsonb_array_elements(coalesce(c.parameters -> 'signals', '[]'::jsonb)) s
    where c.id = p_campaign
      and s ->> 'key' is not null
      and (s ->> 'weight') ~ '^-?[0-9]+(\.[0-9]+)?$'
      and (s ->> 'weight')::numeric <> 0
  ),
  vals as (
    select cl.id as cl_id, cfg.key, cfg.weight,
           greatest(0, least(1, (ls.normalized ->> 'value')::numeric)) as nv,
           ls.normalized ->> 'label_ar' as custom_label,
           sd.reason_low_ar, sd.reason_high_ar
    from public.campaign_leads cl
    join cfg on true
    join public.lead_signals ls on ls.lead_id = cl.lead_id and ls.signal_key = cfg.key
    join public.signal_definitions sd on sd.key = cfg.key
    where cl.campaign_id = p_campaign
  ),
  contrib as (
    select cl_id, key, weight, nv, custom_label,
           weight * nv - least(weight, 0) as c,
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
           round(100 * sum(c) / nullif(sum(abs(weight)), 0))::smallint as score
    from contrib group by cl_id
  ),
  ranked as (
    select cl_id, key, side, reason, custom_label, c,
           row_number() over (partition by cl_id order by c desc, reason) as rn
    from contrib where reason is not null and c > 0
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
    where cl.id = x.id and x.campaign_id = p_campaign
    returning 1
  )
  select count(*) into updated from upd;
  return updated;
end;
$$;
