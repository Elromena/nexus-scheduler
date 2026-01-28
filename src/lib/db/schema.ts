import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// =============================================
// VISITORS TABLE
// Anonymous tracking before form submission
// =============================================
export const visitors = sqliteTable('visitors', {
  id: text('id').primaryKey(),
  fingerprint: text('fingerprint').notNull(),
  
  // Attribution
  referrer: text('referrer'),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  utmTerm: text('utm_term'),
  utmContent: text('utm_content'),
  landingPage: text('landing_page'),
  
  // Device Info
  userAgent: text('user_agent'),
  deviceType: text('device_type'),
  browser: text('browser'),
  browserVersion: text('browser_version'),
  os: text('os'),
  osVersion: text('os_version'),
  screenResolution: text('screen_resolution'),
  
  // Location (from Cloudflare headers)
  ipAddress: text('ip_address'),
  country: text('country'),
  countryCode: text('country_code'),
  city: text('city'),
  region: text('region'),
  timezone: text('timezone'),
  
  // Timestamps
  firstSeenAt: text('first_seen_at').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),
  
  // Session tracking
  totalVisits: integer('total_visits').default(1),
  totalPageViews: integer('total_page_views').default(0),
  totalTimeOnSite: integer('total_time_on_site').default(0),
  
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  fingerprintIdx: index('idx_visitors_fingerprint').on(table.fingerprint),
}));

// =============================================
// SESSIONS TABLE
// Track individual visits
// =============================================
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  visitorId: text('visitor_id').notNull().references(() => visitors.id),
  
  // Session data
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  duration: integer('duration'),
  pageCount: integer('page_count').default(0),
  
  // Entry point
  entryPage: text('entry_page'),
  exitPage: text('exit_page'),
  referrer: text('referrer'),
  
  // UTM for this session
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
}, (table) => ({
  visitorIdx: index('idx_sessions_visitor').on(table.visitorId),
}));

// =============================================
// PAGE VIEWS TABLE
// Every page visited
// =============================================
export const pageViews = sqliteTable('page_views', {
  id: text('id').primaryKey(),
  visitorId: text('visitor_id').notNull().references(() => visitors.id),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  
  pageUrl: text('page_url').notNull(),
  pageTitle: text('page_title'),
  
  // Timing
  timestamp: text('timestamp').notNull(),
  timeOnPage: integer('time_on_page'),
  
  // Scroll depth (0-100)
  scrollDepth: integer('scroll_depth'),
}, (table) => ({
  visitorIdx: index('idx_page_views_visitor').on(table.visitorId),
  sessionIdx: index('idx_page_views_session').on(table.sessionId),
}));

// =============================================
// FORM EVENTS TABLE
// Tracks scheduler form interactions
// =============================================
export const formEvents = sqliteTable('form_events', {
  id: text('id').primaryKey(),
  visitorId: text('visitor_id').notNull().references(() => visitors.id),
  sessionId: text('session_id'),
  
  eventType: text('event_type').notNull(), // 'form_opened', 'step_started', 'step_completed', 'form_abandoned', 'form_submitted'
  step: integer('step'),
  
  timestamp: text('timestamp').notNull(),
  
  // Additional context
  metadata: text('metadata'), // JSON blob
}, (table) => ({
  visitorIdx: index('idx_form_events_visitor').on(table.visitorId),
}));

// =============================================
// BOOKINGS TABLE
// Completed form submissions / leads
// =============================================
export const bookings = sqliteTable('bookings', {
  id: text('id').primaryKey(),
  visitorId: text('visitor_id').references(() => visitors.id),
  
  // Step 1: Contact Info
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  website: text('website').notNull(),
  industry: text('industry'),
  heardFrom: text('heard_from'),
  
  // Step 2: Qualification
  objective: text('objective'),
  budget: text('budget'),
  roleType: text('role_type'),
  
  // Step 3: Scheduling
  scheduledDate: text('scheduled_date'),
  scheduledTime: text('scheduled_time'),
  timezone: text('timezone'),
  
  // Integration IDs
  hubspotContactId: text('hubspot_contact_id'),
  hubspotDealId: text('hubspot_deal_id'),
  hubspotMeetingId: text('hubspot_meeting_id'),
  hubspotDealStage: text('hubspot_deal_stage'), // HubSpot deal stage (synced from HubSpot)
  hubspotDealStageSyncedAt: text('hubspot_deal_stage_synced_at'), // Last sync time
  googleEventId: text('google_event_id'),
  googleMeetLink: text('google_meet_link'),
  
  // Status
  status: text('status').default('pending'), // pending, confirmed, completed, cancelled, no_show

  // Test flag (set when booking created while test_mode is enabled)
  isTest: integer('is_test').default(0),

  // Internal/team flag (exclude from analytics/reports without deleting)
  excludedFromAnalytics: integer('excluded_from_analytics').default(0),
  
  // Attribution snapshot (denormalized)
  attributionSource: text('attribution_source'),
  attributionMedium: text('attribution_medium'),
  attributionCampaign: text('attribution_campaign'),
  attributionLandingPage: text('attribution_landing_page'),
  attributionReferrer: text('attribution_referrer'),
  
  // Timestamps
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at'),
}, (table) => ({
  emailIdx: index('idx_bookings_email').on(table.email),
  statusIdx: index('idx_bookings_status').on(table.status),
  createdIdx: index('idx_bookings_created').on(table.createdAt),
}));

// =============================================
// SETTINGS TABLE
// App configuration
// =============================================
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// =============================================
// VERIFICATION CODES TABLE
// For email verification (manage bookings)
// =============================================
export const verificationCodes = sqliteTable('verification_codes', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  code: text('code').notNull(),
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  emailIdx: index('idx_verification_codes_email').on(table.email),
  codeIdx: index('idx_verification_codes_code').on(table.code),
}));

// =============================================
// SLOT LOCKS TABLE
// Prevent race-condition double bookings (unique date+time)
// =============================================
export const slotLocks = sqliteTable('slot_locks', {
  id: text('id').primaryKey(), // bookingId (keeps 1:1 mapping)
  scheduledDate: text('scheduled_date').notNull(),
  scheduledTime: text('scheduled_time').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  slotUniqueIdx: index('uidx_slot_locks_date_time').on(table.scheduledDate, table.scheduledTime),
}));

// =============================================
// HUBSPOT LOGS TABLE
// Debugging HubSpot API requests/responses
// =============================================
export const hubspotLogs = sqliteTable('hubspot_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`),
  endpoint: text('endpoint').notNull(),
  method: text('method').notNull(),
  status: integer('status'),
  requestBody: text('request_body'),
  responseBody: text('response_body'),
  errorMessage: text('error_message'),
  duration: integer('duration'), // ms
}, (table) => ({
  timestampIdx: index('idx_hubspot_logs_timestamp').on(table.timestamp),
  statusIdx: index('idx_hubspot_logs_status').on(table.status),
}));

// Type exports
export type Visitor = typeof visitors.$inferSelect;
export type NewVisitor = typeof visitors.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type PageView = typeof pageViews.$inferSelect;
export type NewPageView = typeof pageViews.$inferInsert;
export type FormEvent = typeof formEvents.$inferSelect;
export type NewFormEvent = typeof formEvents.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type NewVerificationCode = typeof verificationCodes.$inferInsert;
export type SlotLock = typeof slotLocks.$inferSelect;
export type NewSlotLock = typeof slotLocks.$inferInsert;
export type HubSpotLog = typeof hubspotLogs.$inferSelect;
export type NewHubSpotLog = typeof hubspotLogs.$inferInsert;
