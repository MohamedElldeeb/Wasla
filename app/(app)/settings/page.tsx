import { requireOrg } from '@/lib/org';
import { getT } from '@/lib/i18n/server';
import { logout } from '@/app/actions/auth';
import { regionsToText } from '@/lib/regions';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/app/page-header';
import { LanguageToggle } from '@/components/app/language-toggle';
import { ThemeToggle } from '@/components/app/theme-toggle';
import { num } from '@/lib/format';

// DESIGN.md 6.6: simple stacked sections. Business details are read-only for now (editing arrives with the settings phase).
export default async function SettingsPage() {
  const { org } = await requireOrg();
  const { t } = await getT();
  const s = t.settings;
  const o = t.onboarding;
  const p = org.offer_profile;
  const rows: [string, string | undefined][] = [
    [o.orgName, org.name],
    [o.whatWeSell, p.what_we_sell],
    [o.idealCustomer, p.ideal_customer],
    [o.problems, p.problems_we_solve],
    [o.proof, p.proof_points],
    [o.regions, regionsToText(p.regions)],
    [s.dailyCap, String(num(org.wa_daily_cap))],
  ];
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title={s.title} description={s.desc} />

      <Card>
        <div>
          <CardTitle>{s.business}</CardTitle>
          <CardDescription className="mt-1">{s.businessDesc}</CardDescription>
        </div>
        <dl className="flex flex-col gap-4">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-caption text-fg-muted">{k}</dt>
              <dd className="whitespace-pre-line text-body text-fg" dir="auto">{v?.trim() || s.notSet}</dd>
            </div>
          ))}
        </dl>
        {org.role === 'owner' && <Link href="/settings/profile" className={cn(buttonVariants({ variant: 'secondary' }), 'self-start')}>{t.interview.rerun}</Link>}
      </Card>

      <Card>
        <CardTitle>{s.appearance}</CardTitle>
        <div className="flex flex-col gap-2">
          <span className="text-body-sm font-medium text-fg">{t.shell.language}</span>
          <div><LanguageToggle variant="secondary" /></div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-body-sm font-medium text-fg">{t.shell.theme}</span>
          <div className="max-w-sm"><ThemeToggle /></div>
        </div>
      </Card>

      <Card>
        <CardTitle>{s.account}</CardTitle>
        <p className="text-body-sm text-fg-muted">{org.name} · {s.role[org.role] ?? org.role}</p>
        <form action={logout}><Button type="submit" variant="danger-outline">{s.signOut}</Button></form>
      </Card>
    </div>
  );
}
