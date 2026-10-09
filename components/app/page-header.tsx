import { cn } from '@/lib/utils';

// DESIGN.md 4.3 page header: title (h1) + one-line description on the start side, the single primary action on the end side.
// On mobile the action wraps below and is full width.
export function PageHeader({ title, description, action, className }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="text-h1 text-fg">{title}</h1>
        {description && <p className="mt-1 text-body text-fg-muted">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-col sm:flex-row [&>*]:w-full sm:[&>*]:w-auto">{action}</div>}
    </header>
  );
}
