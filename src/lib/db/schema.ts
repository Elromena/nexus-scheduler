import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ... (Previous tables remain unchanged: visitors, sessions, pageViews, formEvents, bookings, settings, verificationCodes, slotLocks)

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

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  visitorId: text('visitor_id').notNull().references(() => visitors.id),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  duration: integer('duration'),
  pageCount: integer('page_count').default(0),
  entryPage: text('entry_page'),
  exitPage: text('exit_page'),
  referrer: text('referrer'),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
}, (table) => ({
  visitorIdx: index('idx_sessions_visitor').on(table.visitorId),
}));

export const pageViews = sqliteTable('page_views', {
  id: text('id').primaryKey(),
  visitorId: text('visitor_id').notNull().references(() => visitors.id),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  pageUrl: text('page_url').notNull(),
  pageTitle: text('page_title'),
  timestamp: text('timestamp').notNull(),
  timeOnPage: integer('time_on_page'),
  scrollDepth: integer('scroll_depth'),
}, (table) => ({
  visitorIdx: index('idx_page_views_visitor').on(table.visitorId),
  sessionIdx: index('idx_page_views_session').on(table.sessionId),
}));

export const formEvents = sqliteTable('form_events', {
  id: text('id').primaryKey(),
  visitorId: text('visitor_id').notNull().references(() => visitors.id),
  sessionId: text('session_id'),
  eventType: text('event_type').notNull(),
  step: integer('step'),
  timestamp: text('timestamp').notNull(),
  metadata: text('metadata'),
}, (table) => ({
  visitorIdx: index('idx_form_events_visitor').on(table.visitorId),
}));

export const bookings = sqliteTable('bookings', {
  id: text('id').primaryKey(),
  visitorId: text('visitor_id').references(() => visitors.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  website: text('website').notNull(),
  industry: text('industry'),
  heardFrom: text('heard_from'),
  objective: text('objective'),
  budget: text('budget'),
  roleType: text('role_type'),
  scheduledDate: text('scheduled_date'),
  scheduledTime: text('scheduled_time'),
  timezone: text('timezone'),
  hubspotContactId: text('hubspot_contact_id'),
  hubspotDealId: text('hubspot_deal_id'),
  hubspotMeetingId: text('hubspot_meeting_id'),
  hubspotDealStage: text('hubspot_deal_stage'),
  hubspotDealStageSyncedAt: text('hubspot_deal_stage_synced_at'),
  googleEventId: text('google_event_id'),
  googleMeetLink: text('google_meet_link'),
  status: text('status').default('pending'),
  isTest: integer('is_test').default(0),
  excludedFromAnalytics: integer('excluded_from_analytics').default(0),
  attributionSource: text('attribution_source'),
  attributionMedium: text('attribution_medium'),
  attributionCampaign: text('attribution_campaign'),
  attributionLandingPage: text('attribution_landing_page'),
  attributionReferrer: text('attribution_referrer'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at'),
}, (table) => ({
  emailIdx: index('idx_bookings_email').on(table.email),
  statusIdx: index('idx_bookings_status').on(table.status),
  createdIdx: index('idx_bookings_created').on(table.createdAt),
}));

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

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

export const slotLocks = sqliteTable('slot_locks', {
  id: text('id').primaryKey(),
  scheduledDate: text('scheduled_date').notNull(),
  scheduledTime: text('scheduled_time').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  slotUniqueIdx: index('uidx_slot_locks_date_time').on(table.scheduledDate, table.scheduledTime),
}));

// =============================================
// INTEGRATION LOGS TABLE
// Debugging for HubSpot, Google Calendar, Resend
// =============================================
export const integrationLogs = sqliteTable('integration_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`),
  provider: text('provider').notNull(), // 'hubspot', 'google_calendar', 'resend'
  endpoint: text('endpoint').notNull(),
  method: text('method').notNull(),
  status: integer('status'),
  requestBody: text('request_body'),
  responseBody: text('response_body'),
  errorMessage: text('error_message'),
  duration: integer('duration'), // ms
}, (table) => ({
  timestampIdx: index('idx_integration_logs_timestamp').on(table.timestamp),
  providerIdx: index('idx_integration_logs_provider').on(table.provider),
  statusIdx: index('idx_integration_logs_status').on(table.status),
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
export type IntegrationLog = typeof integrationLogs.$inferSelect;
export type NewIntegrationLog = typeof integrationLogs.$inferInsert;
