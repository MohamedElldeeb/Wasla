'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useT } from '@/components/app/i18n-provider';
import { cn } from '@/lib/utils';
import { regionFromPlace, searchPlaces, type GeoRegion, type PlaceOption } from '@/lib/geo/egypt.mjs';

const same = (a: GeoRegion, b: GeoRegion) => (a.governorate ?? '') === (b.governorate ?? '') && (a.city ?? '') === (b.city ?? '') && (a.district ?? '') === (b.district ?? '');

/**
 * Location autocomplete: governorates, cities and districts of Egypt, found by Arabic or English name. Free text is never accepted:
 * a location only exists once it is picked from the list (the search engine can then always geocode it).
 */
export function LocationPicker({ id, selected, onAdd, max }: { id: string; selected: GeoRegion[]; onAdd: (r: GeoRegion) => void; max: number }) {
  const t = useT();
  const w = t.wizard;
  const listId = useId();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const results = useMemo(() => searchPlaces(q, 8), [q]);
  const full = selected.length >= max;
  const taken = (p: PlaceOption) => selected.some((s) => same(s, regionFromPlace(p)));

  function pick(p: PlaceOption) {
    if (full || taken(p)) return;
    onAdd(regionFromPlace(p));
    setQ('');
    setOpen(false);
    setActive(0);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0))); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (open && results[active]) pick(results[active]); }
    else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
        <Input
          id={id}
          role="combobox"
          aria-expanded={open && q.trim().length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          dir="auto"
          value={q}
          disabled={full}
          placeholder={full ? w.locationLimit : w.locationSearch}
          className="ps-9"
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => { if (closeTimer.current) clearTimeout(closeTimer.current); setOpen(true); }}
          onBlur={() => { closeTimer.current = setTimeout(() => setOpen(false), 150); }}
          onKeyDown={onKey}
        />
      </div>
      {open && q.trim().length > 0 && (
        <ul id={listId} role="listbox" aria-label={w.locations} className="absolute inset-x-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-card border border-border bg-surface-raised py-1 shadow-float">
          {results.length === 0 && <li className="px-3 py-3 text-body-sm text-fg-muted" role="presentation">{w.locationNoMatch}</li>}
          {results.map((p, i) => (
            <li
              key={`${p.kind}-${p.governorate.en}-${p.city?.en ?? ''}-${p.district?.en ?? p.en}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              aria-disabled={taken(p)}
              onMouseDown={(e) => { e.preventDefault(); pick(p); }}
              onMouseEnter={() => setActive(i)}
              className={cn('flex min-h-12 cursor-pointer flex-col justify-center px-3 py-1.5', i === active && 'bg-surface-hover', taken(p) && 'cursor-not-allowed opacity-50')}
            >
              <span className="text-body-sm text-fg" dir="auto">{p.label}</span>
              {p.sub && <span className="text-caption text-fg-muted" dir="auto">{p.sub}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
