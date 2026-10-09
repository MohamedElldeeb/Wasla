import { AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** Label always visible above the control, helper text below in caption, error in danger with an icon (DESIGN.md 5 Inputs). */
export function Field({ id, label, optional, helper, error, className, children }: {
  id: string; label: React.ReactNode; optional?: string; helper?: React.ReactNode; error?: string | null; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="text-caption font-normal text-fg-muted">({optional})</span>}
      </Label>
      {children}
      {helper && !error && <p id={`${id}-help`} className="text-caption text-fg-muted">{helper}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="flex items-center gap-1 text-caption text-danger">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
