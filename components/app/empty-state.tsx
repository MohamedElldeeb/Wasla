import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// DESIGN.md 5 Empty states: icon (48px), one-line title, one sentence, one primary button, centered, max width 360.
export function EmptyState({ title, body, href, cta, icon: Icon = Inbox, children }: { title: string; body?: string; href?: string; cta?: string; icon?: LucideIcon; children?: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[360px] flex-col items-center gap-3 px-4 py-12 text-center">
      <Icon className="size-12 text-fg-subtle" aria-hidden />
      <h3 className="text-h3 text-fg">{title}</h3>
      {body && <p className="text-body text-fg-muted">{body}</p>}
      {href && cta && <Link href={href} className={cn(buttonVariants({ size: 'lg' }), 'mt-2')}>{cta}</Link>}
      {children}
    </div>
  );
}
