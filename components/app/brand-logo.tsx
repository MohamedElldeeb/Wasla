import Image from 'next/image';
import { cn } from '@/lib/utils';

/** Wasla lockup. The dark-theme file is the same logo with the wordmark in white (DESIGN v2 section 7); the artwork is not redrawn. */
export function BrandLogo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <>
      <Image src="/brand/wasla-logo.svg" alt="Wasla" width={230} height={96} priority={priority} className={cn('w-auto dark:hidden', className)} />
      <Image src="/brand/wasla-logo-on-dark.svg" alt="Wasla" width={230} height={96} priority={priority} className={cn('hidden w-auto dark:block', className)} />
    </>
  );
}
