import type { Metadata } from 'next';
import Image from 'next/image';
import { OnboardingForm } from '@/components/app/onboarding-form';
import { ar } from '@/lib/i18n/ar';

export const metadata: Metadata = { title: ar.onboarding.title };

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-4 py-10">
      <Image src="/brand/wasla-logo.svg" alt="وصلة" width={230} height={96} className="mx-auto h-20 w-auto" />
      <div>
        <h1 className="text-2xl">{ar.onboarding.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{ar.onboarding.sub}</p>
      </div>
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <OnboardingForm />
      </div>
    </main>
  );
}
