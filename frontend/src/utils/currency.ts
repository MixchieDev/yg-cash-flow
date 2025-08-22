// Currency formatting utilities
export interface CurrencyConfig {
  code: string
  symbol: string
  name: string
  locale: string
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', locale: 'de-CH' },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR' },
  PHP: { code: 'PHP', symbol: '₱', name: 'Philippine Peso', locale: 'en-PH' },
}

export function formatCurrency(amount: number, currencyCode: string = 'USD'): string {
  const config = CURRENCIES[currencyCode] || CURRENCIES.USD
  
  // Handle invalid numbers
  if (isNaN(amount) || !isFinite(amount)) {
    amount = 0
  }
  
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
    }).format(amount)
  } catch (error) {
    // Fallback if locale is not supported
    return `${config.symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}

export function getCurrencySymbol(currencyCode: string = 'USD'): string {
  const config = CURRENCIES[currencyCode] || CURRENCIES.USD
  return config.symbol
}

export function getCurrencyName(currencyCode: string = 'USD'): string {
  const config = CURRENCIES[currencyCode] || CURRENCIES.USD
  return config.name
}