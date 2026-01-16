/**
 * Google Calendar API Integration
 * Uses Service Account with Domain-Wide Delegation
 */

export interface GoogleCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

export interface CalendarEvent {
  id?: string;
  htmlLink?: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  attendees?: Array<{ email: string }>;
  conferenceData?: {
    createRequest?: {
      requestId: string;
      conferenceSolutionKey: { type: string };
    };
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
      label?: string;
    }>;
  };
}

export class GoogleCalendarClient {
  private credentials: GoogleCredentials;
  private targetEmail: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(credentials: GoogleCredentials, targetEmail: string) {
    this.credentials = credentials;
    this.targetEmail = targetEmail;
  }

  /**
   * Generate JWT and exchange for access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    const now = Math.floor(Date.now() / 1000);
    
    // Create JWT header
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };
    
    // Create JWT claim set
    const claim = {
      iss: this.credentials.client_email,
      sub: this.targetEmail, // Impersonate this user
      scope: 'https://www.googleapis.com/auth/calendar',
      aud: this.credentials.token_uri,
      exp: now + 3600,
      iat: now
    };

    // Encode header and claim
    const base64UrlEncode = (obj: object): string => {
      const json = JSON.stringify(obj);
      const base64 = btoa(json);
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };

    const encodedHeader = base64UrlEncode(header);
    const encodedClaim = base64UrlEncode(claim);
    const signatureInput = `${encodedHeader}.${encodedClaim}`;

    // Sign with private key (using Web Crypto API)
    const signature = await this.signJWT(signatureInput, this.credentials.private_key);
    const jwt = `${signatureInput}.${signature}`;

    // Exchange JWT for access token
    const response = await fetch(this.credentials.token_uri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('Google OAuth error:', data);
      throw new Error(`Google OAuth error: ${data.error_description || data.error}`);
    }

    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);
    
    return this.accessToken as string;
  }

  /**
   * Sign JWT using RSA-SHA256
   */
  private async signJWT(input: string, privateKeyPem: string): Promise<string> {
    // Convert PEM to binary
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';
    const pemContents = privateKeyPem
      .replace(pemHeader, '')
      .replace(pemFooter, '')
      .replace(/\s/g, '');
    
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    // Import key
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Sign
    const encoder = new TextEncoder();
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      encoder.encode(input)
    );

    // Convert to base64url
    const base64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Make authenticated request to Google Calendar API
   */
  private async request(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<unknown> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`https://www.googleapis.com/calendar/v3${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Google Calendar API error:', data);
      throw new Error(data.error?.message || 'Google Calendar API error');
    }

    return data;
  }

  /**
   * Get events for a specific date range
   */
  async listEvents(date: string): Promise<CalendarEvent[]> {
    const startOfDay = `${date}T00:00:00Z`;
    const endOfDay = `${date}T23:59:59Z`;
    
    const params = new URLSearchParams({
      singleEvents: 'true',
      timeMin: startOfDay,
      timeMax: endOfDay,
      orderBy: 'startTime'
    });

    const data = await this.request(`/calendars/primary/events?${params}`) as { items?: CalendarEvent[] };
    return data.items || [];
  }

  /**
   * Get available time slots for a date
   */
  async getAvailability(date: string, allSlots: string[]): Promise<string[]> {
    try {
      const events = await this.listEvents(date);
      
      // Extract busy times from events
      const busyTimes = new Set<string>();
      for (const event of events) {
        if (event.start?.dateTime) {
          // Extract HH:MM from ISO datetime
          const time = event.start.dateTime.split('T')[1]?.substring(0, 5);
          if (time) busyTimes.add(time);
        }
      }

      // Filter out busy slots
      return allSlots.filter(slot => !busyTimes.has(slot));
    } catch (error) {
      console.error('Error getting availability:', error);
      // Return all slots if there's an error (fail open)
      return allSlots;
    }
  }

  /**
   * Create a calendar event with Google Meet
   */
  async createEvent(eventData: {
    summary: string;
    description: string;
    startTime: string;
    endTime: string;
    attendeeEmail: string;
    timeZone?: string; // IANA timezone e.g. "America/New_York"
  }): Promise<CalendarEvent> {
    const event: CalendarEvent = {
      summary: eventData.summary,
      description: eventData.description,
      start: { 
        dateTime: eventData.startTime,
        timeZone: eventData.timeZone, // Include timezone for correct display
      },
      end: { 
        dateTime: eventData.endTime,
        timeZone: eventData.timeZone,
      },
      attendees: [{ email: eventData.attendeeEmail }],
      conferenceData: {
        createRequest: {
          requestId: `nexus-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };

    const params = new URLSearchParams({
      sendUpdates: 'all',
      conferenceDataVersion: '1'
    });

    const result = await this.request(
      `/calendars/primary/events?${params}`,
      'POST',
      event
    ) as CalendarEvent;

    return result;
  }

  /**
   * Check if a specific slot is still available
   */
  async isSlotAvailable(date: string, time: string): Promise<boolean> {
    const events = await this.listEvents(date);
    
    for (const event of events) {
      if (event.start?.dateTime) {
        const eventTime = event.start.dateTime.split('T')[1]?.substring(0, 5);
        if (eventTime === time) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Test connection by attempting to get an access token
   * Returns true if credentials are valid
   */
  async testConnection(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      return !!token;
    } catch (error) {
      console.error('Google Calendar connection test failed:', error);
      return false;
    }
  }
}

/**
 * Get Google Calendar client instance
 */
export function getGoogleCalendarClient(
  credentialsJson: string,
  targetEmail: string
): GoogleCalendarClient {
  const credentials = JSON.parse(credentialsJson) as GoogleCredentials;
  return new GoogleCalendarClient(credentials, targetEmail);
}

/**
 * Default available time slots
 */
export const DEFAULT_TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'
];
