'use client';

import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { useT, useLocale } from '@/components/app/i18n-provider';
import { num } from '@/lib/format';
import type { CampaignLead, LeadInsight } from '@/lib/types';

/** Campaign market view (spec 6.3b step 6): shares across all leads, top themes, and a one-page downloadable report. */
export function marketStats(leads: CampaignLead[], insights: Record<string, LeadInsight>) {
  const total = leads.length;
  const noWebsite = leads.filter((l) => !l.leads.website).length;
  const rated = leads.filter((l) => l.leads.rating != null);
  const avg = rated.length ? Math.round((rated.reduce((a, l) => a + Number(l.leads.rating), 0) / rated.length) * 10) / 10 : null;
  let unclaimed = 0;
  let dormant = 0;
  let known = 0;
  const complaints = new Map<string, number>();
  const praise = new Map<string, number>();
  for (const l of leads) {
    const ins = insights[l.leads.id];
    if (!ins) continue;
    known++;
    if (ins.facts.unclaimed_listing) unclaimed++;
    if (ins.facts.activity_label === 'dormant') dormant++;
    for (const c of ins.analysis?.complaints ?? []) complaints.set(c.theme, (complaints.get(c.theme) ?? 0) + (c.count || 1));
    for (const p of ins.analysis?.praised ?? []) praise.set(p.theme, (praise.get(p.theme) ?? 0) + (p.count || 1));
  }
  const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  return { total, noWebsite, avg, unclaimed, dormant, known, complaints: top(complaints), praise: top(praise) };
}

export function MarketInsights({ name, leads, insights }: { name: string; leads: CampaignLead[]; insights: Record<string, LeadInsight> }) {
  const t = useT();
  const locale = useLocale();
  const m = t.insights.market;
  const s = useMemo(() => marketStats(leads, insights), [leads, insights]);
  if (s.total === 0) return null;

  function download() {
    const esc = (x: string) => x.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string);
    const li = (a: [string, number][]) => (a.length ? a.map(([k, n]) => `<li>${esc(k)} (${n})</li>`).join('') : `<li>${esc(m.none)}</li>`);
    const html = `<!doctype html><html lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${esc(m.reportTitle)}: ${esc(name)}</title>
<style>body{font:16px/1.7 system-ui,sans-serif;max-width:720px;margin:32px auto;padding:0 16px;color:#111}h1{font-size:24px}h2{font-size:18px;margin-top:24px}td{padding:4px 12px}</style></head><body>
<h1>${esc(m.reportTitle)}: ${esc(name)}</h1><table>
<tr><td>${esc(m.noWebsite)}</td><td>${esc(m.outOf(s.noWebsite, s.total))}</td></tr>
<tr><td>${esc(m.unclaimed)}</td><td>${esc(m.outOf(s.unclaimed, s.known))}</td></tr>
<tr><td>${esc(m.dormant)}</td><td>${esc(m.outOf(s.dormant, s.known))}</td></tr>
<tr><td>${esc(m.avgRating)}</td><td>${s.avg ?? '—'}</td></tr></table>
<h2>${esc(m.themes)}</h2><ul>${li(s.complaints)}</ul><h2>${esc(m.praise)}</h2><ul>${li(s.praise)}</ul></body></html>`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    a.download = `wasla-market-${name.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40) || 'campaign'}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const stat = (label: string, value: string) => (
    <div className="flex flex-col"><dt className="text-caption text-fg-muted">{label}</dt><dd className="num text-h3 text-fg">{value}</dd></div>
  );
  return (
    <Card className="gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{m.title}</CardTitle>
          <CardDescription className="mt-1">{m.desc}</CardDescription>
        </div>
        <Button type="button" variant="secondary" onClick={download}><Download aria-hidden />{m.export}</Button>
      </div>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stat(m.noWebsite, m.outOf(s.noWebsite, s.total))}
        {stat(m.unclaimed, s.known ? m.outOf(s.unclaimed, s.known) : '—')}
        {stat(m.dormant, s.known ? m.outOf(s.dormant, s.known) : '—')}
        {stat(m.avgRating, s.avg != null ? String(s.avg) : '—')}
      </dl>
      <div className="grid gap-4 sm:grid-cols-2">
        {([[m.themes, s.complaints], [m.praise, s.praise]] as const).map(([title, list]) => (
          <div key={title} className="flex flex-col gap-1">
            <h3 className="text-caption font-medium text-fg-muted">{title}</h3>
            {list.length ? <ul className="text-body-sm text-fg" dir="auto">{list.map(([k, n]) => <li key={k}>{k} <span className="num text-fg-muted">({num(n)})</span></li>)}</ul> : <p className="text-body-sm text-fg-muted">{m.none}</p>}
          </div>
        ))}
      </div>
    </Card>
  );
}
