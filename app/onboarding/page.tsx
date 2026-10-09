import Image from 'next/image';
import { OnboardingForm } from '@/components/app/onboarding-form';
import { LanguageToggle } from '@/components/app/language-toggle';
import { getT } from '@/lib/i18n/server';

export default async function OnboardingPage() {
  const { t } = await getT();
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-4 pb-12 pt-6 md:px-6">
      <div className="flex items-center justify-between">
        <Image src="/brand/wasla-logo.svg" alt="Wasla" width={230} height={96} className="h-12 w-auto" />
        <LanguageToggle />
      </div>
      <main className="flex flex-col gap-6">
        <div>
          <h1 className="text-h1 text-fg">{t.onboarding.title}</h1>
          <p className="mt-1 text-body text-fg-muted">{t.onboarding.sub}</p>
        </div>
        <OnboardingForm />
      </main>
    </div>
  );
}
