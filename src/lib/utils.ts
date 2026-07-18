import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUserMessage(message: string): string {
  if (typeof window === 'undefined') return message;
  
  const email = localStorage.getItem('currentUserEmail') || sessionStorage.getItem('currentUserEmail');
  if (!email) return message;

  let name = '';
  
  if (email.includes('sarah')) {
    name = 'Sarah';
  } else if (email.includes('lohith')) {
    name = 'Lohith';
  } else {
    const prefix = email.split('@')[0];
    const parts = prefix.split(/[._-]/);
    if (parts.length > 0) {
      name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
  }

  return name ? message.replace(/Lohith/g, name) : message;
}

export function formatCurrency(amount: number, decimals: number = 0): string {
  const currency = typeof window !== 'undefined' ? (localStorage.getItem('dashboardCurrency') || 'USD') : 'USD';
  let symbol = 'USD';
  let locale = 'en-US';

  if (currency === 'EUR') {
    symbol = 'EUR';
    locale = 'de-DE';
  } else if (currency === 'GBP') {
    symbol = 'GBP';
    locale = 'en-GB';
  } else if (currency === 'INR') {
    symbol = 'INR';
    locale = 'en-IN';
  } else if (currency === 'CAD') {
    symbol = 'CAD';
    locale = 'en-CA';
  } else {
    symbol = 'USD';
    locale = 'en-US';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: symbol,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${value}%`;
}

// Obfuscates a string to avoid exposing emails in query parameters or cookies
export function obfuscateEmail(email: string): string {
  if (!email) return '';
  // Simple XOR with a key followed by base64 encoding
  const key = 42;
  const chars = email.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ key)).join('');
  if (typeof window !== 'undefined') {
    return btoa(unescape(encodeURIComponent(chars)));
  } else {
    return Buffer.from(chars, 'utf-8').toString('base64');
  }
}

// Deobfuscates a string back to the original email (with fallback)
export function deobfuscateEmail(obfuscated: string): string {
  if (!obfuscated) return '';
  if (obfuscated.includes('@')) return obfuscated; // fallback if already plain email

  try {
    let chars = '';
    if (typeof window !== 'undefined') {
      chars = decodeURIComponent(escape(atob(obfuscated)));
    } else {
      chars = Buffer.from(obfuscated, 'base64').toString('utf-8');
    }
    const key = 42;
    const decrypted = chars.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ key)).join('');
    if (decrypted.includes('@')) return decrypted;
  } catch (e) {
    // Fail silently and return original input
  }
  return obfuscated;
}

export function renderFormattedText(text: string): React.ReactNode {
  if (!text) return '';
  
  // Format user name if "Lohith" is present
  let processed = text;
  if (typeof window !== 'undefined') {
    const email = localStorage.getItem('currentUserEmail') || sessionStorage.getItem('currentUserEmail');
    let name = '';
    if (email) {
      if (email.includes('sarah')) {
        name = 'Sarah';
      } else if (email.includes('lohith')) {
        name = 'Lohith';
      } else {
        const prefix = email.split('@')[0];
        const parts = prefix.split(/[._-]/);
        if (parts.length > 0) {
          name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        }
      }
      processed = name ? text.replace(/Lohith/g, name) : text;
    }
  }

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
  switch (currency) {
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'INR': return '₹';
    case 'CAD': return 'C$';
    default: return '$';
  }
}
