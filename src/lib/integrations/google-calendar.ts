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
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
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
  async listEvents(date: string, hostTimezone: string = 'UTC'): Promise<CalendarEvent[]> {
    // Important: compute the correct UTC range for "that day" in the host timezone.
    const timeMin = zonedTimeToUtc(date, '00:00', hostTimezone).toISOString();
    const timeMax = zonedTimeToUtc(date, '23:59', hostTimezone).toISOString();

    const params = new URLSearchParams({
      singleEvents: 'true',
      timeMin,
      timeMax,
      orderBy: 'startTime',
      timeZone: hostTimezone,
    });

    const data = await this.request(`/calendars/primary/events?${params}`) as { items?: CalendarEvent[] };
    return data.items || [];
  }

  /**
   * Get available time slots for a date
   */
  async getAvailability(
    date: string,
    allSlots: string[],
    hostTimezone: string = 'UTC',
    slotDurationMinutes: number = 30,
    options?: { excludeEventId?: string; strict?: boolean }
  ): Promise<string[]> {
    const strict = options?.strict ?? true; // default: fail closed to prevent double-booking
    try {
      const events = await this.listEvents(date, hostTimezone);
      const busyIntervals = eventsToBusyIntervals(events, { excludeEventId: options?.excludeEventId });

      // If there is an all-day event (or anything that blocks the whole day), no slots.
      if (busyIntervals.some(i => i.blocksAllDay)) return [];

      return allSlots.filter((slot) => {
        const slotStart = zonedTimeToUtc(date, slot, hostTimezone);
        const slotEnd = new Date(slotStart.getTime() + slotDurationMinutes * 60 * 1000);

        // Slot is available only if it does NOT overlap any busy interval
        for (const busy of busyIntervals) {
          if (!busy.start || !busy.end) continue;
          const overlaps = slotStart < busy.end && slotEnd > busy.start;
          if (overlaps) return false;
        }
        return true;
      });
    } catch (error) {
      console.error('Error getting availability:', error);
      return strict ? [] : allSlots;
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
  async isSlotAvailable(
    date: string,
    time: string,
    hostTimezone: string = 'UTC',
    slotDurationMinutes: number = 30,
    options?: { excludeEventId?: string; strict?: boolean }
  ): Promise<boolean> {
    const available = await this.getAvailability(
      date,
      [time],
      hostTimezone,
      slotDurationMinutes,
      { excludeEventId: options?.excludeEventId, strict: options?.strict }
    );
    return available.includes(time);
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

// ===========================
// Timezone helpers (no deps)
// ===========================

function parseDateYMD(date: string): { year: number; month: number; day: number } {
  const [y, m, d] = date.split('-').map(Number);
  return { year: y, month: m, day: d };
}

function parseTimeHM(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':').map(Number);
  return { hour: h, minute: m };
}

function getZonedParts(instant: Date, timeZone: string): Record<string, number> {
  // Use a stable locale; extract numeric parts.
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = dtf.formatToParts(instant);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type === 'year' || p.type === 'month' || p.type === 'day' || p.type === 'hour' || p.type === 'minute' || p.type === 'second') {
      map[p.type] = Number(p.value);
    }
  }
  return map;
}

/**
 * Convert a wall-clock date+time in an IANA timezone into a UTC Date.
 * Implements a small iterative correction (similar to date-fns-tz) without extra deps.
 */
function zonedTimeToUtc(date: string, time: string, timeZone: string): Date {
  const { year, month, day } = parseDateYMD(date);
  const { hour, minute } = parseTimeHM(time);

  const targetAsUTC = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = new Date(targetAsUTC);

  // Iterate a couple times to correct for timezone offset / DST.
  for (let i = 0; i < 3; i++) {
    const p = getZonedParts(guess, timeZone);
    const guessAsUTCFromZoned = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second || 0);
    const diff = guessAsUTCFromZoned - targetAsUTC;
    if (diff === 0) break;
    guess = new Date(guess.getTime() - diff);
  }

  return guess;
}

type BusyInterval = { start: Date | null; end: Date | null; blocksAllDay?: boolean; eventId?: string };

function eventsToBusyIntervals(events: CalendarEvent[], opts?: { excludeEventId?: string }): BusyInterval[] {
  const intervals: BusyInterval[] = [];

  for (const event of events) {
    if (opts?.excludeEventId && event.id && event.id === opts.excludeEventId) continue;

    // All-day events: Calendar API uses "date" (YYYY-MM-DD) instead of "dateTime"
    const isAllDay = !!event.start?.date && !!event.end?.date && !event.start?.dateTime && !event.end?.dateTime;
    if (isAllDay) {
      intervals.push({ start: null, end: null, blocksAllDay: true, eventId: event.id });
      continue;
    }

    if (event.start?.dateTime && event.end?.dateTime) {
      const start = new Date(event.start.dateTime);
      const end = new Date(event.end.dateTime);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        intervals.push({ start, end, eventId: event.id });
      }
    }
  }

  return intervals;
}
