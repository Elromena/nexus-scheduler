import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { getGoogleCalendarClient, DEFAULT_TIME_SLOTS } from '@/lib/integrations/google-calendar';
import { isPastDate, isWeekend } from '@/lib/utils/dates';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date } = body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Check if date is in the past
    if (isPastDate(date)) {
      return NextResponse.json({
        success: true,
        slots: [],
        message: 'Cannot book past dates'
      });
    }

    // Check if date is a weekend
    if (isWeekend(date)) {
      return NextResponse.json({
        success: true,
        slots: [],
        message: 'Not available on weekends'
      });
    }

    const { env } = getCloudflareContext();
    const db = drizzle(env.DB, { schema });

    // Check if we're in test mode
    const testModeSetting = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, 'test_mode'))
      .get();

    const isTestMode = testModeSetting?.value === 'true' || env.TEST_MODE === 'true';

    // Get configured time slots
    const slotsSetting = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, 'calendar_slots'))
      .get();

    let allSlots = DEFAULT_TIME_SLOTS;
    if (slotsSetting?.value) {
      try {
        allSlots = JSON.parse(slotsSetting.value);
      } catch {
        // Use default slots
      }
    }

    // If in test mode, return mock available slots
    if (isTestMode) {
      // Simulate some slots being taken
      const availableSlots = allSlots.filter((_, index) => index % 2 === 0 || index % 3 === 0);
      
      return NextResponse.json({
        success: true,
        slots: availableSlots,
        testMode: true
      });
    }

    // Get Google Calendar credentials
    const googleCreds = env.GOOGLE_SERVICE_ACCOUNT;
    const calendarEmail = env.GOOGLE_CALENDAR_EMAIL;

    if (!googleCreds || !calendarEmail) {
      console.error('Google Calendar credentials not configured');
      // Fall back to returning all slots
      return NextResponse.json({
        success: true,
        slots: allSlots,
        warning: 'Calendar integration not configured'
      });
    }

    // Get availability from Google Calendar
    const calendar = getGoogleCalendarClient(googleCreds, calendarEmail);
    const availableSlots = await calendar.getAvailability(date, allSlots);

    return NextResponse.json({
      success: true,
      slots: availableSlots
    });

  } catch (error) {
    console.error('Slots error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch available slots' },
      { status: 500 }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
