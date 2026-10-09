import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Search, Gauge, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n/server';
import { buttonVariants } from '@/components/ui/button';
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
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4">
          <Image src="/brand/wasla-logo.svg" alt="Wasla" width={230} height={96} priority className="h-12 w-auto" />
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <Link href="/login" className={buttonVariants({ variant: 'ghost' })}>{l.login}</Link>
            <Link href="/signup" className={buttonVariants({ variant: 'outline' })}>{l.signup}</Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-16 sm:py-24">
          <h1 className="text-3xl leading-tight sm:text-5xl">{l.heroTitle}</h1>
          <p className="text-lg text-muted-foreground">{l.heroSub}</p>
          <DemoButton />
        </section>

        <section className="border-y bg-card">
          <div className="mx-auto w-full max-w-5xl px-4 py-14">
            <h2 className="mb-8 text-2xl">{l.stepsTitle}</h2>
            <ol className="grid gap-6 sm:grid-cols-3">
              {l.steps.map((s, i) => {
                const Icon = icons[i];
                return (
                  <li key={s.t} className="flex flex-col gap-3 rounded-2xl border bg-background p-6">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Icon className="size-5" aria-hidden /></span>
                    <strong className="text-lg">{i + 1}. {s.t}</strong>
                    <span className="text-muted-foreground">{s.d}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 py-14">
          <h2 className="mb-8 text-2xl">{l.pointsTitle}</h2>
          <ul className="grid gap-6 sm:grid-cols-3">
            {l.points.map((p) => (
              <li key={p.t} className="flex flex-col gap-2">
                <strong className="text-lg">{p.t}</strong>
                <span className="text-muted-foreground">{p.d}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">{l.footer}</footer>
    </div>
  );
}
