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
  async getAvailability(date: string, allSlots: string[], hostTimezone: string = 'UTC'): Promise<string[]> {
    try {
      const events = await this.listEvents(date);
      
      console.log(`Google Calendar Events for ${date}:`, JSON.stringify(events.map(e => ({
        summary: e.summary,
        start: e.start.dateTime,
        end: e.end.dateTime
      }))));

      // Extract busy times from events
      const busyTimes = new Set<string>();
      for (const event of events) {
        if (event.start?.dateTime && event.end?.dateTime) {
          const startTime = new Date(event.start.dateTime);
          const endTime = new Date(event.end.dateTime);
          
          console.log(`Busy event: ${event.summary} (${startTime.toISOString()} - ${endTime.toISOString()})`);

          // Block all slots that fall within this event's duration
          for (const slot of allSlots) {
            // Create a date object for this slot in the host's timezone
            // Note: date is YYYY-MM-DD, slot is HH:MM
            const [hour, min] = slot.split(':').map(Number);
            
            // We need to compare this slot to the meeting time
            // The best way is to construct a Date for the slot in the host's timezone
            const slotDate = new Date(new Intl.DateTimeFormat('en-US', {
              timeZone: hostTimezone,
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
              hour: 'numeric',
              minute: 'numeric',
              hour12: false
            }).format(startTime)); // Use startTime just to get the base date
            
            // Set the hours/mins for the slot we're checking
            const [y, m, d] = date.split('-').map(Number);
            // Construct a Date that represents this slot in the host's local time
            // and convert it to a universal timestamp for comparison
            const slotTimestamp = new Date(new Intl.DateTimeFormat('en-US', {
              timeZone: hostTimezone,
            }).format(new Date(y, m - 1, d)));
            
            // Simpler approach: construct ISO string in host timezone and compare
            // But JS Dates are hard. Let's use a robust method:
            
            // 1. Get slot start/end in UTC
            const slotStart = new Date(`${date}T${slot}:00`); // Server local
            // Actually, the easiest way is to use the hostTimezone offset
            
            // Create a formatter to see what time it is in host timezone for a given UTC date
            const formatter = new Intl.DateTimeFormat('en-US', {
              timeZone: hostTimezone,
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });
            
            // Check if this event's time range covers this slot
            // A slot is busy if the event starts before or at the slot time, 
            // AND the event ends after the slot starts.
            
            // Let's convert the event start/end to "HH:MM" in the host's timezone
            const eventStartLocal = new Intl.DateTimeFormat('en-GB', {
              timeZone: hostTimezone,
              hour: '2-digit',
              minute: '2-digit',
            }).format(startTime);
            
            const eventEndLocal = new Intl.DateTimeFormat('en-GB', {
              timeZone: hostTimezone,
              hour: '2-digit',
              minute: '2-digit',
            }).format(endTime);

            // If the event spans across days, it's more complex, but for same-day:
            if (slot >= eventStartLocal && slot < eventEndLocal) {
              busyTimes.add(slot);
              console.log(`Blocking slot: ${slot} because of event ${event.summary} (${eventStartLocal}-${eventEndLocal})`);
            }
          }
        }
      }

      // Filter out busy slots
      const available = allSlots.filter(slot => !busyTimes.has(slot));
      console.log(`Final available slots: ${available.length}/${allSlots.length}`);
      return available;
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
   * Update an existing calendar event
   */
  async updateEvent(eventId: string, eventData: {
    summary?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    timeZone?: string;
  }): Promise<CalendarEvent> {
    const updatePayload: Partial<CalendarEvent> = {};
    
    if (eventData.summary) {
      updatePayload.summary = eventData.summary;
    }
    if (eventData.description) {
      updatePayload.description = eventData.description;
    }
    if (eventData.startTime) {
      updatePayload.start = { 
        dateTime: eventData.startTime,
        timeZone: eventData.timeZone,
      };
    }
    if (eventData.endTime) {
      updatePayload.end = { 
        dateTime: eventData.endTime,
        timeZone: eventData.timeZone,
      };
    }

    const params = new URLSearchParams({
      sendUpdates: 'all',
    });

    const result = await this.request(
      `/calendars/primary/events/${eventId}?${params}`,
      'PATCH',
      updatePayload
    ) as CalendarEvent;

    return result;
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string): Promise<void> {
    const params = new URLSearchParams({
      sendUpdates: 'all', // Notify attendees
    });

    await this.request(
      `/calendars/primary/events/${eventId}?${params}`,
      'DELETE'
    );
  }

  /**
   * Get a single event by ID
   */
  async getEvent(eventId: string): Promise<CalendarEvent | null> {
    try {
      const result = await this.request(
        `/calendars/primary/events/${eventId}`,
        'GET'
      ) as CalendarEvent;
      return result;
    } catch (error) {
      console.error('Error getting event:', error);
      return null;
    }
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
