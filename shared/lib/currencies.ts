export const MAJOR_CURRENCIES = [
  { code: 'USD', name: 'United States Dollar' }, { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' }, { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CNY', name: 'Chinese Yuan' }, { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CAD', name: 'Canadian Dollar' }, { code: 'AUD', name: 'Australian Dollar' },
  { code: 'HKD', name: 'Hong Kong Dollar' }, { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'INR', name: 'Indian Rupee' }, { code: 'KRW', name: 'South Korean Won' },
  { code: 'BRL', name: 'Brazilian Real' }, { code: 'MXN', name: 'Mexican Peso' },
  { code: 'ZAR', name: 'South African Rand' }, { code: 'TRY', name: 'Turkish Lira' },
  { code: 'SAR', name: 'Saudi Riyal' }, { code: 'AED', name: 'UAE Dirham' },
  { code: 'IDR', name: 'Indonesian Rupiah' }, { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'THB', name: 'Thai Baht' }, { code: 'PHP', name: 'Philippine Peso' },
  { code: 'VND', name: 'Vietnamese Dong' }, { code: 'PLN', name: 'Polish Zloty' },
  { code: 'SEK', name: 'Swedish Krona' }, { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'DKK', name: 'Danish Krone' }, { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'TWD', name: 'New Taiwan Dollar' }, { code: 'ILS', name: 'Israeli New Shekel' },
  { code: 'CLP', name: 'Chilean Peso' }, { code: 'COP', name: 'Colombian Peso' },
  { code: 'ARS', name: 'Argentine Peso' }, { code: 'PEN', name: 'Peruvian Sol' },
  { code: 'CZK', name: 'Czech Koruna' }, { code: 'HUF', name: 'Hungarian Forint' },
  { code: 'RON', name: 'Romanian Leu' }, { code: 'BGN', name: 'Bulgarian Lev' },
  { code: 'PKR', name: 'Pakistani Rupee' }, { code: 'BDT', name: 'Bangladeshi Taka' },
  { code: 'LKR', name: 'Sri Lankan Rupee' }, { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'KES', name: 'Kenyan Shilling' }, { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'MAD', name: 'Moroccan Dirham' }, { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'QAR', name: 'Qatari Riyal' }, { code: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'BHD', name: 'Bahraini Dinar' }, { code: 'OMR', name: 'Omani Rial' },
] as const;

export const MAJOR_CURRENCY_CODES = MAJOR_CURRENCIES.map(({ code }) => code) as [string, ...string[]];

export function currencySymbol(code: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: code, currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).formatToParts(0).find((part) => part.type === 'currency')?.value || code;
  } catch {
    return code;
  }
}
