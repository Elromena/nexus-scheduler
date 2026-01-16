/**
 * Geolocation utilities using Cloudflare headers
 */

export interface GeoData {
  country: string | null;
  countryCode: string | null;
  city: string | null;
  region: string | null;
  timezone: string | null;
  ip: string | null;
}

/**
 * Timezone to country code mapping for fallback detection
 * When cf-ipcountry header is missing or wrong, infer from timezone
 */
const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  // Asia
  'Asia/Taipei': 'TW',
  'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR',
  'Asia/Shanghai': 'CN',
  'Asia/Hong_Kong': 'HK',
  'Asia/Singapore': 'SG',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Bangkok': 'TH',
  'Asia/Jakarta': 'ID',
  'Asia/Manila': 'PH',
  'Asia/Ho_Chi_Minh': 'VN',
  'Asia/Saigon': 'VN',
  'Asia/Kolkata': 'IN',
  'Asia/Mumbai': 'IN',
  'Asia/Karachi': 'PK',
  'Asia/Dhaka': 'BD',
  'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA',
  'Asia/Jerusalem': 'IL',
  'Asia/Tel_Aviv': 'IL',
  'Asia/Nicosia': 'CY',
  
  // Europe
  'Europe/London': 'GB',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Rome': 'IT',
  'Europe/Madrid': 'ES',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Vienna': 'AT',
  'Europe/Zurich': 'CH',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/Helsinki': 'FI',
  'Europe/Dublin': 'IE',
  'Europe/Warsaw': 'PL',
  'Europe/Prague': 'CZ',
  'Europe/Budapest': 'HU',
  'Europe/Bucharest': 'RO',
  'Europe/Athens': 'GR',
  'Europe/Istanbul': 'TR',
  'Europe/Moscow': 'RU',
  'Europe/Kiev': 'UA',
  'Europe/Kyiv': 'UA',
  'Europe/Samara': 'RU',
  'Europe/Lisbon': 'PT',
  
  // Americas
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Phoenix': 'US',
  'America/Anchorage': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Montreal': 'CA',
  'America/Mexico_City': 'MX',
  'America/Sao_Paulo': 'BR',
  'America/Buenos_Aires': 'AR',
  'America/Santiago': 'CL',
  'America/Lima': 'PE',
  'America/Bogota': 'CO',
  'America/Caracas': 'VE',
  
  // Oceania
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU',
  'Pacific/Auckland': 'NZ',
  
  // Africa
  'Africa/Johannesburg': 'ZA',
  'Africa/Lagos': 'NG',
  'Africa/Cairo': 'EG',
  'Africa/Nairobi': 'KE',
  'Africa/Casablanca': 'MA',
};

/**
 * Extract geolocation data from Cloudflare request headers
 * Cloudflare Workers on Webflow Cloud should provide these headers
 */
export function getGeoFromHeaders(headers: Headers, debug = false): GeoData {
  // Try multiple header variations (Cloudflare, Vercel, standard)
  let countryCode = 
    headers.get('cf-ipcountry') || 
    headers.get('CF-IPCountry') ||
    headers.get('x-vercel-ip-country') || 
    headers.get('x-country-code') ||
    null;
    
  const city = 
    headers.get('cf-ipcity') || 
    headers.get('CF-IPCity') ||
    headers.get('x-vercel-ip-city') || 
    headers.get('x-city') ||
    null;
    
  const region = 
    headers.get('cf-region') || 
    headers.get('cf-region-code') ||
    headers.get('CF-Region') ||
    headers.get('x-vercel-ip-country-region') || 
    null;
    
  const timezone = 
    headers.get('cf-timezone') || 
    headers.get('CF-Timezone') ||
    headers.get('x-vercel-ip-timezone') ||
    null;
    
  const ip = 
    headers.get('cf-connecting-ip') || 
    headers.get('CF-Connecting-IP') ||
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
    null;

  // FALLBACK: If country code is "US" but timezone suggests otherwise, use timezone
  // This handles cases where cf-ipcountry is missing or defaults to US
  if (timezone && (!countryCode || countryCode === 'US')) {
    const inferredCountry = TIMEZONE_TO_COUNTRY[timezone];
    if (inferredCountry && inferredCountry !== 'US') {
      if (debug) {
        console.log(`Country fallback: Header said "${countryCode}", timezone "${timezone}" suggests "${inferredCountry}"`);
      }
      countryCode = inferredCountry;
    }
  }

  if (debug) {
    console.log('Geo headers debug:', {
      countryCode,
      city,
      region,
      timezone,
      ip,
      allHeaders: Object.fromEntries(headers.entries()),
    });
  }

  return {
    country: countryCode, // Raw country code, will be converted by getCountryName
    countryCode,
    city,
    region,
    timezone,
    ip,
  };
}

/**
 * Get country name from country code
 */
export function getCountryName(code: string | null): string | null {
  if (!code) return null;
  
  const countries: Record<string, string> = {
    'US': 'United States',
    'GB': 'United Kingdom',
    'CA': 'Canada',
    'AU': 'Australia',
    'DE': 'Germany',
    'FR': 'France',
    'JP': 'Japan',
    'CN': 'China',
    'IN': 'India',
    'BR': 'Brazil',
    'MX': 'Mexico',
    'ES': 'Spain',
    'IT': 'Italy',
    'NL': 'Netherlands',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark',
    'FI': 'Finland',
    'CH': 'Switzerland',
    'AT': 'Austria',
    'BE': 'Belgium',
    'IE': 'Ireland',
    'NZ': 'New Zealand',
    'SG': 'Singapore',
    'HK': 'Hong Kong',
    'KR': 'South Korea',
    'AE': 'United Arab Emirates',
    'SA': 'Saudi Arabia',
    'ZA': 'South Africa',
    'NG': 'Nigeria',
    'EG': 'Egypt',
    'IL': 'Israel',
    'PL': 'Poland',
    'CZ': 'Czech Republic',
    'RU': 'Russia',
    'UA': 'Ukraine',
    'TR': 'Turkey',
    'AR': 'Argentina',
    'CL': 'Chile',
    'CO': 'Colombia',
    'PE': 'Peru',
    'VE': 'Venezuela',
    'PH': 'Philippines',
    'TH': 'Thailand',
    'VN': 'Vietnam',
    'MY': 'Malaysia',
    'ID': 'Indonesia',
    'PK': 'Pakistan',
    'BD': 'Bangladesh',
    // Additional countries for timezone fallback
    'TW': 'Taiwan',
    'CY': 'Cyprus',
    'GR': 'Greece',
    'HU': 'Hungary',
    'RO': 'Romania',
    'PT': 'Portugal',
    'KE': 'Kenya',
    'MA': 'Morocco',
  };
  
  return countries[code.toUpperCase()] || code;
}

/**
 * Infer country code from timezone string
 * Exported for use by track API when client timezone is available
 */
export function inferCountryFromTimezone(timezone: string | null): string | null {
  if (!timezone) return null;
  return TIMEZONE_TO_COUNTRY[timezone] || null;
}

/**
 * Anonymize IP address (keep first 3 octets for IPv4)
 */
export function anonymizeIP(ip: string | null): string | null {
  if (!ip) return null;
  
  // IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  }
  
  // IPv6 - truncate to first 4 groups
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 4) {
      return `${parts.slice(0, 4).join(':')}::`;
    }
  }
  
  return ip;
}
