'use client';

import * as React from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { COUNTRY_CALLING_OPTIONS, shouldOpenDropdownAbove } from './country-phone-input';

export const COUNTRY_OPTIONS = COUNTRY_CALLING_OPTIONS.map(({ country, name }) => ({
  code: country,
  name,
}));

export function filterCountryOptions(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return COUNTRY_OPTIONS;
  return COUNTRY_OPTIONS.filter(({ code, name }) =>
    name.toLowerCase().includes(normalized) || code.toLowerCase().includes(normalized),
  );
}

export function CountrySelect({
  value,
  onChange,
  required = false,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [openAbove, setOpenAbove] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const filtered = filterCountryOptions(query);

  React.useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  React.useLayoutEffect(() => {
    if (!open || !containerRef.current) return;
    const updatePlacement = () => {
      if (!containerRef.current) return;
      setOpenAbove(shouldOpenDropdownAbove(containerRef.current.getBoundingClientRect(), window.innerHeight, 320));
    };
    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [open]);

  return <div ref={containerRef} className="relative">
    <button
      type="button"
      disabled={disabled}
      onClick={() => setOpen((current) => !current)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-left text-white outline-none transition-colors hover:border-zinc-700 focus:border-zinc-600 disabled:opacity-50"
      aria-label="Select country"
      aria-expanded={open}
      aria-haspopup="listbox"
    >
      <span className={value ? 'text-white' : 'text-zinc-500'}>{value || 'Select a country'}</span>
      <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {required && <input className="sr-only" tabIndex={-1} aria-hidden="true" required value={value} onChange={() => undefined} />}
    {open && <div className={`absolute left-0 z-[110] w-full min-w-[280px] overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 text-white shadow-2xl ${openAbove ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'}`}>
      <div className="flex items-center gap-2 border-b border-zinc-800 p-3">
        <Search className="h-4 w-4 shrink-0 text-zinc-500" />
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type a country name" aria-label="Filter countries" className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-zinc-500" />
      </div>
      <div role="listbox" aria-label="Countries" className="max-h-64 overflow-y-auto p-2">
        {filtered.map((option) => <button
          type="button"
          role="option"
          aria-selected={value === option.name}
          key={option.code}
          onClick={() => {
            onChange(option.name);
            setQuery('');
            setOpen(false);
          }}
          className="flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-left text-white hover:bg-zinc-900"
        >
          <span>{option.name}</span>
          <span className="flex shrink-0 items-center gap-2 font-mono text-zinc-500">{option.code}{value === option.name && <Check className="h-4 w-4 text-white" />}</span>
        </button>)}
        {filtered.length === 0 && <div className="p-5 text-center text-zinc-400">No country found.</div>}
      </div>
    </div>}
  </div>;
}
