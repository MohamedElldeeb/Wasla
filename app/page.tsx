import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Search, Gauge, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n/server';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LanguageToggle } from '@/components/app/language-toggle';
import { DemoButton } from '@/components/app/demo-button';

// Public landing page. Signed-in users go straight to their dashboard.
export default async function Landing() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect('/dashboard');
  const { t } = await getT();
  const l = t.landing;
  const icons = [Search, Gauge, Send];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-2 px-4 md:px-6 lg:px-8">
          <Image src="/brand/wasla-logo.svg" alt="Wasla" width={230} height={96} priority className="h-9 w-auto shrink-0" />
          <div className="flex items-center">
            <LanguageToggle className="px-2" />
            <Link href="/login" className={cn(buttonVariants({ variant: 'ghost' }), 'px-2')}>{l.login}</Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-12 md:px-6 lg:px-8 lg:py-24">
          <h1 className="text-display max-w-2xl text-fg">{l.heroTitle}</h1>
          <p className="max-w-prose text-body text-fg-muted">{l.heroSub}</p>
          <div className="flex max-w-sm flex-col gap-3">
            <DemoButton />
            <Link href="/signup" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>{l.signup}</Link>
          </div>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-12 md:px-6 lg:px-8">
            <h2 className="mb-6 text-h2 text-fg">{l.stepsTitle}</h2>
            <ol className="grid gap-3 md:grid-cols-3 md:gap-4">
              {l.steps.map((s, i) => {
                const Icon = icons[i];
                return (
                  <li key={s.t} className="flex flex-col gap-3 rounded-card border border-border bg-bg p-4 md:p-6">
                    <span className="flex size-10 items-center justify-center rounded-control bg-primary-soft text-primary"><Icon className="size-5" aria-hidden /></span>
                    <strong className="text-h3 text-fg">{i + 1}. {s.t}</strong>
                    <span className="text-body text-fg-muted">{s.d}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] px-4 py-12 md:px-6 lg:px-8">
          <h2 className="mb-6 text-h2 text-fg">{l.pointsTitle}</h2>
          <ul className="grid gap-6 md:grid-cols-3">
            {l.points.map((p) => (
              <li key={p.t} className="flex flex-col gap-2">
                <strong className="text-h3 text-fg">{p.t}</strong>
                <span className="text-body text-fg-muted">{p.d}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-body-sm text-fg-muted">{l.footer}</footer>
    </div>
  );
}
