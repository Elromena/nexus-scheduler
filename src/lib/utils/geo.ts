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
 * Extract geolocation data from Cloudflare request headers
 * Cloudflare Workers on Webflow Cloud should provide these headers
 */
export function getGeoFromHeaders(headers: Headers, debug = false): GeoData {
  // Try multiple header variations (Cloudflare, Vercel, standard)
  const countryCode = 
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
  };
  
  return countries[code.toUpperCase()] || code;
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
