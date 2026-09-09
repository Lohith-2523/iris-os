import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { currencySymbol, MAJOR_CURRENCY_CODES } from "@/lib/currencies"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

let activeUserName = '';
let activeCurrency = 'USD';

export function setActiveWorkspaceContext(input: { userName?: string; currency?: string }) {
  if (input.userName !== undefined) activeUserName = input.userName;
  if (input.currency !== undefined) activeCurrency = input.currency;
}

export function formatUserMessage(message: string): string {
  const firstName = activeUserName.trim().split(/\s+/)[0];
  return firstName ? message.replace(/Lohith/g, firstName) : message;
}

export function formatCurrencyFor(
  amount: number,
  currency: string,
  decimals: number = 0,
): string {
  const normalizedCurrency = MAJOR_CURRENCY_CODES.includes(currency) ? currency : 'USD';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: normalizedCurrency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amount);
}

export function formatCurrency(amount: number, decimals: number = 0): string {
  return formatCurrencyFor(amount, activeCurrency, decimals);
}

export function formatPercent(value: number): string {
  return `${value}%`;
}

export function renderFormattedText(text: string): React.ReactNode {
  if (!text) return '';
  
  // Format user name if "Lohith" is present
  let processed = text;
  const firstName = activeUserName.trim().split(/\s+/)[0];
  processed = firstName ? text.replace(/Lohith/g, firstName) : text;

  // Parse markdown: **bold**, *italic*, `code`
  const parts = processed.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return React.createElement('strong', { key: index, className: 'font-bold text-white' }, part.slice(2, -2));
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return React.createElement('em', { key: index, className: 'italic text-zinc-350' }, part.slice(1, -1));
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return React.createElement('code', { key: index, className: 'font-mono bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded text-zinc-200 text-[10px]' }, part.slice(1, -1));
    }
    return part;
  });
}

export function getCurrencySymbol(currency: string): string {
  return currencySymbol(currency);
}
