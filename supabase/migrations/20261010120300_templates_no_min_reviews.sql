-- Few reviews is a signal (often a new business that needs clients), not a reason to drop a lead (spec 6.1).
-- The seeded templates no longer carry a minimum-reviews filter.
update public.campaign_templates
set parameters = jsonb_set(parameters, '{filters}', (parameters -> 'filters') - 'min_reviews')
where parameters -> 'filters' ? 'min_reviews';
