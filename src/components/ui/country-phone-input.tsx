'use client';

import * as React from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from 'libphonenumber-js';
import { cn } from '@/lib/utils';

type CallingCodeOption = {
  country: CountryCode;
  name: string;
  callingCode: string;
};

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
const preferredRegionByCallingCode: Partial<Record<string, CountryCode>> = {
  '+1': 'US',
  '+7': 'RU',
  '+44': 'GB',
  '+47': 'NO',
  '+358': 'FI',
  '+590': 'GP',
  '+599': 'CW',
};

export const COUNTRY_CALLING_OPTIONS: CallingCodeOption[] = getCountries()
  .map((country) => ({
    country,
    name: countryNames.of(country) || country,
    callingCode: `+${getCountryCallingCode(country)}`,
  }))
  .sort((left, right) => left.name.localeCompare(right.name));

function optionForCallingCode(callingCode: string) {
  const preferredRegion = preferredRegionByCallingCode[callingCode];
  return COUNTRY_CALLING_OPTIONS.find((option) => option.country === preferredRegion)
    || COUNTRY_CALLING_OPTIONS.find((option) => option.callingCode === callingCode)
    || COUNTRY_CALLING_OPTIONS.find((option) => option.country === 'IN')!;
}

function initialParts(value: string) {
  const normalized = value.trim();
  const callingCode = Array.from(new Set(COUNTRY_CALLING_OPTIONS.map((option) => option.callingCode)))
    .sort((left, right) => right.length - left.length)
    .find((code) => normalized.startsWith(code));
  const option = optionForCallingCode(callingCode || '+91');
  return {
    option,
    local: callingCode ? normalized.slice(callingCode.length).replace(/\D/g, '') : normalized.replace(/\D/g, ''),
  };
}

export function shouldOpenDropdownAbove(
  anchor: Pick<DOMRect, 'top' | 'bottom'>,
  viewportHeight: number,
  dropdownHeight = 340,
) {
  const spaceBelow = viewportHeight - anchor.bottom;
  const spaceAbove = anchor.top;
  return spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
}

export function CountryPhoneInput({ value, onChange, required = true, className, id, name, placeholder = 'Phone number', disabled = false }: { value: string; onChange: (value: string) => void; required?: boolean; className?: string; id?: string; name?: string; placeholder?: string; disabled?: boolean }) {
  const [selectedOption, setSelectedOption] = React.useState(() => initialParts(value).option);
  const [localNumber, setLocalNumber] = React.useState(() => initialParts(value).local);
  const [open, setOpen] = React.useState(false);
  const [openAbove, setOpenAbove] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, ' ');
  const filtered = COUNTRY_CALLING_OPTIONS.filter((option) => {
    if (!normalizedQuery) return true;
    const digits = normalizedQuery.replace(/\D/g, '');
    return option.name.toLowerCase().includes(normalizedQuery)
      || option.callingCode.includes(normalizedQuery.startsWith('+') ? normalizedQuery : `+${normalizedQuery}`)
      || Boolean(digits && option.callingCode.slice(1).includes(digits));
  });

  React.useEffect(() => {
    const next = initialParts(value);
    if (value !== `${selectedOption.callingCode}${localNumber}`) {
      setSelectedOption(next.option);
      setLocalNumber(next.local);
    }
  }, [value, selectedOption.callingCode, localNumber]);

  React.useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  React.useLayoutEffect(() => {
    if (!open || !containerRef.current) return;
    const updatePlacement = () => {
      if (!containerRef.current) return;
      setOpenAbove(shouldOpenDropdownAbove(containerRef.current.getBoundingClientRect(), window.innerHeight));
    };
    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [open]);

  const update = (option: CallingCodeOption, local: string) => {
    const digits = local.replace(/\D/g, '');
    // Keep the selected prefix in the controlled value even before the user
    // enters local digits. Otherwise selecting (for example) +44 emits an
    // empty string, and the value-sync effect restores the +91 fallback.
    onChange(`${option.callingCode}${digits}`);
  };

  return <div ref={containerRef} className="country-phone-input relative flex min-w-0">
    <button
      type="button"
      disabled={disabled}
      onClick={() => setOpen((current) => !current)}
      className="country-phone-code-button flex min-w-24 items-center justify-between gap-2 rounded-l-xl border border-r-0 border-zinc-800 bg-zinc-950 px-3 font-semibold text-white disabled:opacity-50"
      aria-label={`Country calling code ${selectedOption.callingCode}. Choose another country calling code`}
      aria-expanded={open}
    >
      <span>{selectedOption.callingCode}</span><ChevronDown className={`h-4 w-4 transition-transform ${open && openAbove ? 'rotate-180' : ''}`} />
    </button>
    <input id={id} name={name} type="tel" inputMode="tel" autoComplete="tel" required={required} disabled={disabled} value={localNumber} onChange={(event) => { const local = event.target.value.replace(/[^0-9 ()-]/g, ''); setLocalNumber(local); update(selectedOption, local); }} placeholder={placeholder} className={cn('country-phone-number-input min-w-0 flex-1 rounded-l-none rounded-r-xl border border-zinc-800 bg-zinc-950 p-3 text-white outline-none placeholder:text-zinc-500 focus:border-zinc-600', className)} />
    {open && <div className={`country-phone-dropdown absolute left-0 z-[100] w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 text-white shadow-2xl ${openAbove ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'}`}>
      <div className="country-phone-search flex items-center gap-2 border-b border-zinc-800 bg-zinc-950 p-3 text-white"><Search className="h-4 w-4 shrink-0" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search country or +91" aria-label="Search by country name or calling code" className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-zinc-500" /></div>
      <div className="max-h-72 overflow-y-auto p-2">{filtered.map((option) => <button type="button" key={option.country} onClick={() => { setSelectedOption(option); setOpen(false); setQuery(''); update(option, localNumber); }} className="country-phone-option flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-left text-white hover:bg-zinc-900"><span className="truncate">{option.name}</span><span className="flex shrink-0 items-center gap-2 font-semibold">{option.callingCode}{selectedOption.country === option.country && <Check className="h-4 w-4" />}</span></button>)}</div>
      {filtered.length === 0 && <div className="p-5 text-center text-zinc-400">No country or calling code found.</div>}
    </div>}
  </div>;
}
