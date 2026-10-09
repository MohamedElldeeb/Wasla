'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LanguageToggle } from '@/components/app/language-toggle';
import { ThemeToggle } from '@/components/app/theme-toggle';
import { useT } from '@/components/app/i18n-provider';
import { logout } from '@/app/actions/auth';
import { cn } from '@/lib/utils';

/** Avatar button that opens the account sheet (bottom sheet on mobile, dialog on desktop): business, language, appearance, sign out. */
export function UserMenu({ initial, orgName, role, className, showName }: { initial: string; orgName: string; role: string; className?: string; showName?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.shell.menu}
        className={cn('transition-ui flex min-h-12 items-center gap-3 rounded-control text-start hover:bg-surface-muted', showName ? 'w-full px-2' : 'size-12 justify-center rounded-full', className)}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-body-sm font-semibold text-primary-fg" aria-hidden>{initial}</span>
        {showName && <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-fg" dir="auto">{orgName}</span>}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.shell.menu}</DialogTitle>
            <DialogDescription dir="auto">{orgName} · {t.settings.role[role] ?? role}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <span className="text-body-sm font-medium text-fg">{t.shell.language}</span>
            <LanguageToggle variant="secondary" className="w-full" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-body-sm font-medium text-fg">{t.shell.theme}</span>
            <ThemeToggle />
          </div>
          <form action={logout}>
            <Button type="submit" variant="danger-outline" className="w-full"><LogOut className="rtl:-scale-x-100" aria-hidden />{t.common.signOut}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
