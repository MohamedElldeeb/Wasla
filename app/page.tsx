import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getT } from '@/lib/i18n/server';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LanguageToggle } from '@/components/app/language-toggle';
import { ThemeIconToggle } from '@/components/app/theme-icon-toggle';
import { DemoButton } from '@/components/app/demo-button';
import { BrandLogo } from '@/components/app/brand-logo';
import { LandingShot } from '@/components/app/landing-shot';

type Plan = { code: 'free' | 'starter' | 'growth'; monthly_credits: number; price_egp: number | null };

/** Public plan data (code, credits, price). Prices are OPEN (NULL) until decided, so the page shows "Contact us" for those. */
async function loadPlans(): Promise<Plan[]> {
  try {
    const { data } = await createAdminClient().from('plans').select('code, monthly_credits, price_egp').order('monthly_credits');
    return (data ?? []) as Plan[];
  } catch {
    return [];
  }
}

const SECTION = 'mx-auto w-full max-w-[1200px] px-4 py-12 md:px-6 md:py-24 lg:px-8';

// Public landing page (DESIGN v2 section 7). Signed-in users go straight to their dashboard.
export default async function Landing() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect('/dashboard');
  const { t, locale } = await getT();
  const l = t.landing;
  const plans = await loadPlans();

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between gap-2 px-4 md:px-6 lg:px-8">
          <BrandLogo priority className="h-9 shrink-0" />
          <nav aria-label={t.nav.main} className="hidden items-center gap-6 text-body-sm text-fg-body lg:flex">
            <a href="#how" className="transition-ui hover:text-fg">{l.nav.how}</a>
            <a href="#brief" className="transition-ui hover:text-fg">{l.nav.brief}</a>
            <a href="#funnel" className="transition-ui hover:text-fg">{l.nav.transparency}</a>
            <a href="#pricing" className="transition-ui hover:text-fg">{l.nav.pricing}</a>
            <a href="#faq" className="transition-ui hover:text-fg">{l.nav.faq}</a>
          </nav>
          <div className="flex items-center gap-1">
            <LanguageToggle className="px-2" />
            <ThemeIconToggle />
            <Link href="/login" className={cn(buttonVariants({ variant: 'ghost' }), 'hidden px-3 sm:inline-flex')}>{l.login}</Link>
            <Link href="/signup" className="transition-ui inline-flex h-12 items-center rounded-full bg-fg px-4 text-body-sm font-medium text-bg hover:opacity-90 lg:h-10 rtl:font-semibold">{l.startFree}</Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* 2. hero */}
        <section className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 pt-12 md:px-6 md:pt-24 lg:px-8">
          <div className="flex max-w-3xl flex-col gap-6">
            <h1 className="text-display text-fg">{l.heroTitle}</h1>
            <p className="text-body-lg max-w-2xl text-fg-muted">{l.heroSub}</p>
            <div className="flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:items-start">
              <div className="sm:w-72"><DemoButton /></div>
              <a href="#how" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'sm:mt-0')}>{l.howSecondary}</a>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[880px] pb-12 md:pb-24">
            <div aria-hidden className="pointer-events-none absolute inset-x-[-10%] bottom-0 h-3/4" style={{ background: 'var(--hero-floor)' }} />
            <div className="relative overflow-hidden rounded-card border border-border bg-surface">
              <LandingShot shot="review" locale={locale} alt={l.heroShotAlt} width={1068} height={1060} priority />
            </div>
          </div>
        </section>

        {/* 3. how it works */}
        <section id="how" className="border-y border-border">
          <div className={SECTION}>
            <h2 className="text-section mb-8 text-fg md:mb-12">{l.stepsTitle}</h2>
            <ol className="grid gap-8 md:grid-cols-3 md:gap-12">
              {l.steps.map((s, i) => (
                <li key={s.t} className="flex flex-col gap-3 border-t border-border-strong pt-4">
                  <span className="mono num text-body-sm text-fg-muted">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="text-h2 text-fg">{s.t}</h3>
                  <p className="text-body text-fg-muted">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 4. the lead brief */}
        <section id="brief" className={SECTION}>
          <div className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
            <div className="flex flex-col gap-6">
              <h2 className="text-section text-fg">{l.briefTitle}</h2>
              <p className="text-body-lg text-fg-muted">{l.briefBody}</p>
              <ul className="flex flex-col gap-3">
                {l.briefPoints.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-body text-fg-body"><Check className="mt-1 size-4 shrink-0 text-brand" aria-hidden />{p}</li>
                ))}
              </ul>
            </div>
            <div className="overflow-hidden rounded-card border border-border bg-surface">
              <LandingShot shot="brief" locale={locale} alt={l.briefTitle} width={768} height={660} />
            </div>
          </div>
        </section>

        {/* 5. the funnel / transparency */}
        <section id="funnel" className="border-y border-border">
          <div className={SECTION}>
            <div className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
              <div className="overflow-hidden rounded-card border border-border bg-surface md:order-2">
                <LandingShot shot="funnel" locale={locale} alt={l.funnelTitle} width={768} height={700} />
              </div>
              <div className="flex flex-col gap-6 md:order-1">
                <h2 className="text-section text-fg">{l.funnelTitle}</h2>
                <p className="text-body-lg text-fg-muted">{l.funnelBody}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. built for Egypt and MENA */}
        <section className={SECTION}>
          <div className="flex max-w-3xl flex-col gap-6">
            <h2 className="text-section text-fg">{l.egyptTitle}</h2>
            <p className="text-body-lg text-fg-muted">{l.egyptBody}</p>
            <ul className="flex flex-col divide-y divide-border border-y border-border">
              {l.egyptPoints.map((p) => <li key={p} className="py-3 text-body text-fg-body">{p}</li>)}
            </ul>
          </div>
        </section>

        {/* 7. pricing: prices come from the database; OPEN (NULL) prices show "Contact us" */}
        <section id="pricing" className="border-y border-border">
          <div className={SECTION}>
            <div className="mb-8 flex flex-col gap-3 md:mb-12">
              <h2 className="text-section text-fg">{l.pricingTitle}</h2>
              <p className="text-body-lg text-fg-muted">{l.pricingBody}</p>
            </div>
            <ul className="grid gap-px overflow-hidden rounded-card border border-border bg-border md:grid-cols-3 md:gap-4 md:overflow-visible md:border-0 md:bg-transparent">
              {plans.map((p) => (
                <li key={p.code} className="flex flex-col gap-2 bg-surface p-4 md:rounded-card md:border md:border-border md:p-6">
                  <h3 className="text-h2 text-fg">{l.plans[p.code]}</h3>
                  <p className="num text-body text-fg-muted">{l.planCredits(p.monthly_credits)}</p>
                  <p className="num text-body font-medium text-fg">{p.price_egp == null ? l.planContact : l.planPrice(p.price_egp)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 8. FAQ */}
        <section id="faq" className={SECTION}>
          <h2 className="text-section mb-8 text-fg md:mb-12">{l.faqTitle}</h2>
          <div className="max-w-3xl divide-y divide-border border-y border-border">
            {l.faq.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 text-h3 text-fg [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden className="mono text-fg-muted group-open:hidden">+</span>
                  <span aria-hidden className="mono hidden text-fg-muted group-open:inline">−</span>
                </summary>
                <p className="pt-2 text-body text-fg-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 9. final CTA band */}
        <section className="border-t border-border">
          <div className={cn(SECTION, 'flex flex-col items-start gap-6')}>
            <h2 className="text-section max-w-2xl text-fg">{l.finalTitle}</h2>
            <p className="text-body-lg max-w-2xl text-fg-muted">{l.finalBody}</p>
            <div className="w-full max-w-sm"><DemoButton /></div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-body-sm text-fg-muted">{l.footer}</footer>
    </div>
  );
}
