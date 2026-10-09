import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function EmptyState({ title, body, href, cta }: { title: string; body?: string; href?: string; cta?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center">
      <h3 className="text-base">{title}</h3>
      {body && <p className="max-w-sm text-sm text-muted-foreground">{body}</p>}
      {href && cta && (
        <Link href={href} className={cn(buttonVariants({ variant: 'cta' }), 'mt-2')}>
          {cta}
        </Link>
      )}
    </div>
  );
}
