import { z } from 'zod';

// Step 1 validation schema
export const step1Schema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  // More permissive website validation - accepts URLs or domain names
  website: z.string().min(1, 'Website is required').refine((val) => {
    // Accept URLs with protocol
    if (val.startsWith('http://') || val.startsWith('https://')) {
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    }
    // Accept domain-like strings (e.g., example.com, sub.example.co.uk)
    return /^[\w-]+(\.[\w-]+)+/.test(val);
  }, 'Please enter a valid website'),
  industry: z.string().min(1, 'Please select an industry'),
  heardFrom: z.string().min(1, 'Please tell us where you heard about us'),
});

// Step 2 validation schema
export const step2Schema = z.object({
  objective: z.string().min(1, 'Please select an objective'),
  budget: z.string().min(1, 'Please select a budget range'),
  roleType: z.string().min(1, 'Please select your role'),
});

// Step 3 validation schema
export const step3Schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  timezone: z.string().optional(),
});

// Full booking validation (all steps combined)
export const bookingSchema = step1Schema.merge(step2Schema).merge(step3Schema);

// Tracking event validation
export const trackingEventSchema = z.object({
  event: z.string(),
  visitorId: z.string(),
  sessionId: z.string(),
  fingerprint: z.string(),
  timestamp: z.string(),
  isNewSession: z.boolean().optional(),
  data: z.object({
    url: z.string().optional(),
    path: z.string().optional(),
    title: z.string().optional(),
    referrer: z.string().optional(),
    landingPage: z.string().optional(),
    utm: z.record(z.string()).optional(),
    firstTouchUtm: z.record(z.string()).optional(),
    device: z.object({
      deviceType: z.string().optional(),
      browser: z.string().optional(),
      browserVersion: z.string().optional(),
      os: z.string().optional(),
      osVersion: z.string().optional(),
      screenResolution: z.string().optional(),
      userAgent: z.string().optional(),
    }).optional(),
    step: z.number().optional(),
    timeOnPage: z.number().optional(),
    scrollDepth: z.number().optional(),
  }).passthrough(),
});

// Type exports
export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;
export type BookingData = z.infer<typeof bookingSchema>;
export type TrackingEvent = z.infer<typeof trackingEventSchema>;

// Validation helpers
export function validateStep1(data: unknown) {
  return step1Schema.safeParse(data);
}

export function validateStep2(data: unknown) {
  return step2Schema.safeParse(data);
}

export function validateStep3(data: unknown) {
  return step3Schema.safeParse(data);
}

export function validateBooking(data: unknown) {
  return bookingSchema.safeParse(data);
}

export function validateTrackingEvent(data: unknown) {
  return trackingEventSchema.safeParse(data);
}

// Sanitize string (remove potential XSS)
export function sanitize(str: string): string {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

// Normalize URL
export function normalizeUrl(url: string): string {
  let normalized = url.trim().toLowerCase();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  return normalized;
}
