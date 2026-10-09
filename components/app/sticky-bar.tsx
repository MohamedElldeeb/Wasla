import { cn } from '@/lib/utils';

/**
 * Sticky bottom action bar for mobile flows (wizard, review, onboarding). Inside the app shell it sits above the bottom
 * navigation (64px + safe area); `standalone` pages (no bottom nav) pin it to the bottom edge. From lg it is a normal
 * in-flow row. A spacer keeps the last content visible on mobile.
 */
export function StickyBar({ children, note, className, standalone }: { children: React.ReactNode; note?: React.ReactNode; className?: string; standalone?: boolean }) {
  return (
    <>
      <div aria-hidden className="h-24 lg:hidden" />
      <div
        className={cn(
          'fixed inset-x-0 z-30 flex flex-col gap-2 border-t border-border bg-surface p-4 shadow-float lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none',
          standalone ? 'bottom-0 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pb-0' : 'bottom-[calc(64px+env(safe-area-inset-bottom))]',
          className
        )}
      >
        {note && <p className="text-body-sm text-fg-muted">{note}</p>}
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </>
  );
}
