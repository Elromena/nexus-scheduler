import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { desc, sql } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { getHubSpotClient } from '@/lib/integrations/hubspot';
import { getGoogleCalendarClient } from '@/lib/integrations/google-calendar';

export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    
    // Auth check
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    if (token !== env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = drizzle(env.DB, { schema });

    // Get recent bookings with integration status
    const recentBookings = await db
      .select({
        id: schema.bookings.id,
        email: schema.bookings.email,
        createdAt: schema.bookings.createdAt,
        hubspotContactId: schema.bookings.hubspotContactId,
        hubspotDealId: schema.bookings.hubspotDealId,
        googleEventId: schema.bookings.googleEventId,
        googleMeetLink: schema.bookings.googleMeetLink,
        status: schema.bookings.status,
      })
      .from(schema.bookings)
      .orderBy(desc(schema.bookings.createdAt))
      .limit(10);

    // Check test mode - ONLY from database setting
    const testModeSetting = await db
      .select()
      .from(schema.settings)
      .where(sql`${schema.settings.key} = 'test_mode'`)
      .get();

    // Use DB setting only (defaults to false if not set)
    const isTestMode = testModeSetting?.value === 'true';

    // Summarize integration status
    const summary = {
      testMode: isTestMode,
      testModeSource: 'database',
      dbTestMode: testModeSetting?.value === 'true',
      dbTestModeExists: !!testModeSetting,
      hubspotConfigured: !!env.HUBSPOT_ACCESS_TOKEN,
      googleConfigured: !!(env.GOOGLE_SERVICE_ACCOUNT && env.GOOGLE_CALENDAR_EMAIL),
      debugLogging: env.DEBUG_LOGGING === 'true',
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        recentBookings,
      },
    });

  } catch (error) {
    console.error('Debug fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch debug info' },
      { status: 500 }
    );
  }
}

// Test integrations endpoint
export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    
    // Auth check
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    if (token !== env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { testType } = body;

    const results: Record<string, { success: boolean; message: string; data?: unknown }> = {};

    // Test HubSpot
    if (testType === 'hubspot' || testType === 'all') {
      if (!env.HUBSPOT_ACCESS_TOKEN) {
        results.hubspot = { success: false, message: 'HUBSPOT_ACCESS_TOKEN not configured' };
      } else {
        try {
          const hubspot = getHubSpotClient(env.HUBSPOT_ACCESS_TOKEN);
          // Test by fetching account info
          const response = await fetch('https://api.hubapi.com/account-info/v3/details', {
            headers: { 'Authorization': `Bearer ${env.HUBSPOT_ACCESS_TOKEN}` },
          });
          if (response.ok) {
            const data = await response.json();
            results.hubspot = { 
              success: true, 
              message: `Connected to HubSpot portal: ${data.portalId}`,
              data: { portalId: data.portalId, timeZone: data.timeZone }
            };
          } else {
            const error = await response.text();
            results.hubspot = { success: false, message: `HubSpot API error: ${error}` };
          }
        } catch (err) {
          results.hubspot = { success: false, message: `HubSpot error: ${err}` };
        }
      }
    }

    // Test Google Calendar
    if (testType === 'google' || testType === 'all') {
      if (!env.GOOGLE_SERVICE_ACCOUNT || !env.GOOGLE_CALENDAR_EMAIL) {
        results.google = { 
          success: false, 
          message: !env.GOOGLE_SERVICE_ACCOUNT 
            ? 'GOOGLE_SERVICE_ACCOUNT not configured' 
            : 'GOOGLE_CALENDAR_EMAIL not configured'
        };
      } else {
        try {
          const calendar = getGoogleCalendarClient(
            env.GOOGLE_SERVICE_ACCOUNT,
            env.GOOGLE_CALENDAR_EMAIL
          );
          // Test by validating credentials
          const connected = await calendar.testConnection();
          if (connected) {
            results.google = { 
              success: true, 
              message: `Google Calendar connected for: ${env.GOOGLE_CALENDAR_EMAIL}`,
              data: { calendarEmail: env.GOOGLE_CALENDAR_EMAIL }
            };
          } else {
            results.google = { success: false, message: 'Failed to authenticate with Google' };
          }
        } catch (err) {
          results.google = { success: false, message: `Google error: ${err}` };
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });

  } catch (error) {
    console.error('Integration test error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to test integrations' },
      { status: 500 }
    );
  }
}
