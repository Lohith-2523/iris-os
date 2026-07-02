import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUserMessage(message: string): string {
  if (typeof window === 'undefined') return message;
  
  const email = localStorage.getItem('currentUserEmail') || sessionStorage.getItem('currentUserEmail') || 'lohith@apex.co';
  let name = 'Lohith';
  
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

  return message.replace(/Lohith/g, name);
}

export function formatCurrency(amount: number, decimals: number = 0): string {
  if (typeof window === 'undefined') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(amount);
  }

  const currency = localStorage.getItem('dashboardCurrency') || 'USD';
  let rate = 1.0;
  let symbol = 'USD';
  let locale = 'en-US';

  if (currency === 'EUR') {
    rate = 0.92;
    symbol = 'EUR';
    locale = 'de-DE';
  } else if (currency === 'GBP') {
    rate = 0.78;
    symbol = 'GBP';
    locale = 'en-GB';
  } else if (currency === 'INR') {
    rate = 83.5;
    symbol = 'INR';
    locale = 'en-IN';
  } else if (currency === 'CAD') {
    rate = 1.37;
    symbol = 'CAD';
    locale = 'en-CA';
  }

  const converted = amount * rate;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: symbol,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(converted);
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
