'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/app/empty-state';
import { LeadCard } from '@/components/app/lead-card';
import { FilterBar, LeadsDesktopTable, NO_FILTERS, applyFilters, type LeadFilters } from '@/components/app/leads-table';
import { useT } from '@/components/app/i18n-provider';
import { num } from '@/lib/format';
import type { CampaignLead } from '@/lib/types';

/** All leads across campaigns, filterable; cards on mobile, table from lg. */
export function LeadsBrowser({ items }: { items: CampaignLead[] }) {
  const t = useT();
  const [filters, setFilters] = useState<LeadFilters>(NO_FILTERS);
  const shown = useMemo(() => applyFilters(items, filters), [items, filters]);

  if (items.length === 0) return <EmptyState title={t.leadsPage.emptyTitle} body={t.leadsPage.emptyBody} href="/campaigns/new" cta={t.campaigns.new} />;
  return (
    <div className="flex flex-col gap-4">
      <FilterBar value={filters} onChange={setFilters} count={shown.length} />
      <span className="num hidden text-body-sm text-fg-muted lg:inline">{num(shown.length)} {t.campaign.leadsCount}</span>
      {shown.length === 0 ? (
        <EmptyState title={t.leadsPage.noResults} body={t.leadsPage.noResultsBody}>
          <Button variant="secondary" onClick={() => setFilters(NO_FILTERS)}>{t.leadsPage.reset}</Button>
        </EmptyState>
      ) : (
        <>
          <ul className="flex flex-col gap-3 lg:hidden">{shown.map((cl) => <li key={cl.id}><LeadCard item={cl} /></li>)}</ul>
          <LeadsDesktopTable items={shown} />
        </>
      )}
    </div>
  );
}
