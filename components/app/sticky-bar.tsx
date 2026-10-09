import { cn } from '@/lib/utils';

/**
 * Sticky bottom action bar for mobile flows (wizard, review). It sits above the bottom navigation (64px + safe area)
 * and becomes a normal in-flow row from lg. A spacer keeps the last content visible.
 */
export function StickyBar({ children, note, className }: { children: React.ReactNode; note?: React.ReactNode; className?: string }) {
  return (
    <>
      <div aria-hidden className="h-24 lg:hidden" />
      <div
        className={cn(
          'fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 flex flex-col gap-2 border-t border-border bg-surface p-4 shadow-float lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none',
          className
        )}
      >
        {note && <p className="text-body-sm text-fg-muted">{note}</p>}
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </>
  );
}
