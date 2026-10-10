import { BrandLogo } from '@/components/app/brand-logo';
import { LanguageToggle } from '@/components/app/language-toggle';

// DESIGN.md 6.1: single column, max width 400, top-aligned with 48px padding on mobile, centered vertically on desktop.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center px-4 pb-12 pt-12 lg:justify-center lg:pt-0">
      <div className="absolute end-4 top-4">
        <LanguageToggle />
      </div>
      <main className="flex w-full max-w-[400px] flex-col gap-6">
        <BrandLogo priority className="h-16 self-start" />
        {children}
      </main>
    </div>
  );
}
