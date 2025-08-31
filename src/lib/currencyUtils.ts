// Country to currency mapping based on ISO 4217 currency codes
// Updated to resolve module caching issue
export const countryToCurrency: Record<string, string> = {
  // Europe
  'Austria': 'EUR',
  'Belgium': 'EUR',
  'Bulgaria': 'BGN', 
  'Croatia': 'EUR',
  'Cyprus': 'EUR',
  'Czech Republic': 'CZK',
  'Denmark': 'DKK',
  'Estonia': 'EUR',
  'Finland': 'EUR',
  'France': 'EUR',
  'Germany': 'EUR',
  'Greece': 'EUR',
  'Hungary': 'HUF',
  'Ireland': 'EUR',
  'Italy': 'EUR',
  'Latvia': 'EUR',
  'Lithuania': 'EUR',
  'Luxembourg': 'EUR',
  'Malta': 'EUR',
  'Netherlands': 'EUR',
  'Poland': 'PLN',
  'Portugal': 'EUR',
  'Romania': 'RON',
  'Slovakia': 'EUR',
  'Slovenia': 'EUR',
  'Spain': 'EUR',
  'Sweden': 'SEK',
  'Switzerland': 'CHF',
  'United Kingdom': 'GBP',
  'Norway': 'NOK',
  'Iceland': 'ISK',
  
  // Americas
  'United States': 'USD',
  'Canada': 'CAD',
  'Mexico': 'MXN',
  'Brazil': 'BRL',
  'Argentina': 'ARS',
  'Chile': 'CLP',
  'Colombia': 'COP',
  'Peru': 'PEN',
  'Uruguay': 'UYU',
  'Venezuela': 'VES',
  'Bolivia': 'BOB',
  'Ecuador': 'USD',
  'Paraguay': 'PYG',
  'Guatemala': 'GTQ',
  'Costa Rica': 'CRC',
  'Panama': 'USD',
  'Nicaragua': 'NIO',
  'Honduras': 'HNL',
  'El Salvador': 'USD',
  'Belize': 'BZD',
  'Jamaica': 'JMD',
  'Cuba': 'CUP',
  'Dominican Republic': 'DOP',
  'Haiti': 'HTG',
  
  // Asia
  'Japan': 'JPY',
  'China': 'CNY',
  'India': 'INR',
  'South Korea': 'KRW',
  'Indonesia': 'IDR',
  'Thailand': 'THB',
  'Vietnam': 'VND',
  'Philippines': 'PHP',
  'Malaysia': 'MYR',
  'Singapore': 'SGD',
  'Taiwan': 'TWD',
  'Hong Kong': 'HKD',
  'Bangladesh': 'BDT',
  'Pakistan': 'PKR',
  'Sri Lanka': 'LKR',
  'Nepal': 'NPR',
  'Bhutan': 'BTN',
  'Myanmar': 'MMK',
  'Cambodia': 'KHR',
  'Mongolia': 'MNT',
  'Maldives': 'MVR',
  'Afghanistan': 'AFN',
  'Iran': 'IRR',
  'Iraq': 'IQD',
  'Israel': 'ILS',
  'Jordan': 'JOD',
  'Kuwait': 'KWD',
  'Lebanon': 'LBP',
  'Oman': 'OMR',
  'Qatar': 'QAR',
  'Saudi Arabia': 'SAR',
  'Syria': 'SYP',
  'Turkey': 'TRY',
  'United Arab Emirates': 'AED',
  'Yemen': 'YER',
  'Bahrain': 'BHD',
  'Kazakhstan': 'KZT',
  'Uzbekistan': 'UZS',
  'Georgia': 'GEL',
  'Armenia': 'AMD',
  'Azerbaijan': 'AZN',
  
  // Africa
  'South Africa': 'ZAR',
  'Nigeria': 'NGN',
  'Egypt': 'EGP',
  'Kenya': 'KES',
  'Morocco': 'MAD',
  'Tunisia': 'TND',
  'Algeria': 'DZD',
  'Libya': 'LYD',
  'Ghana': 'GHS',
  'Ethiopia': 'ETB',
  'Uganda': 'UGX',
  'Tanzania': 'TZS',
  'Rwanda': 'RWF',
  'Zambia': 'ZMW',
  'Zimbabwe': 'ZWL',
  'Botswana': 'BWP',
  'Namibia': 'NAD',
  'Angola': 'AOA',
  'Mozambique': 'MZN',
  'Madagascar': 'MGA',
  'Mali': 'XOF',
  'Burkina Faso': 'XOF',
  'Niger': 'XOF',
  'Senegal': 'XOF',
  'Guinea': 'GNF',
  'Sierra Leone': 'SLL',
  'Liberia': 'LRD',
  'Benin': 'XOF',
  'Togo': 'XOF',
  'Gambia': 'GMD',
  'Chad': 'XAF',
  'Sudan': 'SDG',
  'Somalia': 'SOS',
  'Djibouti': 'DJF',
  'Comoros': 'KMF',
  'Burundi': 'BIF',
  'Congo': 'XAF',
  'Cameroon': 'XAF',
  'Gabon': 'XAF',
  'Lesotho': 'LSL',
  
  // Oceania
  'Australia': 'AUD',
  'New Zealand': 'NZD',
  
  // Default fallback
  'Serbia': 'RSD'
};

/**
 * Get currency code for a given country
 */
export const getCurrencyForCountry = (country: string): string => {
  return countryToCurrency[country] || 'EUR'; // Default to EUR if country not found
};

/**
 * Format currency with proper symbol
 */
export const formatCurrency = (amount: number, currency: string): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  } catch (error) {
    // Fallback for unsupported currencies
    return `${amount} ${currency}`;
  }
};

/**
 * Get common currency symbols
 */
export const getCurrencySymbol = (currency: string): string => {
  const symbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CHF': '₣',
    'CAD': 'C$',
    'AUD': 'A$',
    'CNY': '¥',
    'INR': '₹',
    'RSD': 'РСД',
    'PLN': 'zł',
    'CZK': 'Kč',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr'
  };
  return symbols[currency] || currency;
};