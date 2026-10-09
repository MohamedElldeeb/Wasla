import Image from 'next/image';
import { OnboardingForm } from '@/components/app/onboarding-form';
import { LanguageToggle } from '@/components/app/language-toggle';
import { getT } from '@/lib/i18n/server';

export default async function OnboardingPage() {
  const { t } = await getT();
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <Image src="/brand/wasla-logo.svg" alt="Wasla" width={230} height={96} className="h-16 w-auto" />
        <LanguageToggle />
      </div>
      <div>
        <h1 className="text-2xl">{t.onboarding.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.onboarding.sub}</p>
      </div>
      <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        <OnboardingForm />
      </div>
    </main>
  );
}
