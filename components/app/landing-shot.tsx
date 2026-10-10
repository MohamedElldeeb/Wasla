import Image from 'next/image';
import { cn } from '@/lib/utils';

/** A real Wasla UI screenshot (rendered from the actual components by scripts/landing-shots.mjs), light and dark variants swapped by theme. */
export function LandingShot({ shot, locale, alt, width, height, className, priority = false }: { shot: 'review' | 'brief' | 'funnel'; locale: string; alt: string; width: number; height: number; className?: string; priority?: boolean }) {
  return (
    <>
      <Image src={`/landing/${shot}-${locale}-light.jpg`} alt={alt} width={width} height={height} priority={priority} className={cn('h-auto w-full dark:hidden', className)} />
      <Image src={`/landing/${shot}-${locale}-dark.jpg`} alt={alt} width={width} height={height} priority={priority} className={cn('hidden h-auto w-full dark:block', className)} />
    </>
  );
}
