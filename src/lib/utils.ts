import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUserMessage(message: string): string {
  if (typeof window === 'undefined') return message;
  
  const email = localStorage.getItem('currentUserEmail') || 'lohith@apex.co';
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

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${value}%`;
}
