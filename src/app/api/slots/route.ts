import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { getGoogleCalendarClient, type GoogleCalendarLogger } from '@/lib/integrations/google-calendar';
import { isPastDate } from '@/lib/utils/dates';
import { slotLocks } from '@/lib/db/slot-locks';

// Default calendar configuration
const DEFAULT_CALENDAR_CONFIG = {
  availableDays: [1, 2, 3, 4, 5], // Mon-Fri (0=Sun, 1=Mon, etc.)
  businessHours: {
    start: '09:00',
    end: '17:00',
  },
  slotDuration: 30, // minutes
  bufferTime: 0, // minutes between meetings
  blockedDates: [] as string[], // specific dates to block
};

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

    const { env } = getCloudflareContext();
    const db = drizzle(env.DB, { schema });

    // Host timezone (source of truth for slot generation & calendar queries)
    const hostTimezoneSetting = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, 'host_timezone'))
      .get();
    const hostTimezone = hostTimezoneSetting?.value || 'America/New_York';

    // Get calendar configuration
    const calendarConfigSetting = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, 'calendar_config'))
      .get();

    let calendarConfig = DEFAULT_CALENDAR_CONFIG;
    if (calendarConfigSetting?.value) {
      try {
        calendarConfig = { ...DEFAULT_CALENDAR_CONFIG, ...JSON.parse(calendarConfigSetting.value) };
      } catch {
        // Use default config
      }
    }

    // Parse date properly (as local date)
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Check if day is available
    if (!calendarConfig.availableDays.includes(dayOfWeek)) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return NextResponse.json({
        success: true,
        slots: [],
        message: `Not available on ${dayNames[dayOfWeek]}s`
      });
    }

    // Check if date is blocked
    if (calendarConfig.blockedDates.includes(date)) {
      return NextResponse.json({
        success: true,
        slots: [],
        message: 'This date is not available'
      });
    }

    // Check if we're in test mode
    const testModeSetting = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, 'test_mode'))
      .get();
    const isTestMode = testModeSetting?.value === 'true';

    // Get configured time slots OR generate from business hours
    const slotsSetting = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, 'calendar_slots'))
      .get();

    let allSlots: string[];
    
    if (slotsSetting?.value) {
      try {
        const parsed = JSON.parse(slotsSetting.value);
        // Only use custom slots if array actually has items
        if (Array.isArray(parsed) && parsed.length > 0) {
          allSlots = parsed;
        } else {
          allSlots = generateSlotsFromBusinessHours(calendarConfig);
        }
      } catch {
        allSlots = generateSlotsFromBusinessHours(calendarConfig);
      }
    } else {
      allSlots = generateSlotsFromBusinessHours(calendarConfig);
    }
    
    // If in test mode, return mock available slots
    if (isTestMode) {
      const availableSlots = allSlots.filter((_, index) => index % 2 === 0 || index % 3 === 0);
      return NextResponse.json({
        success: true,
        slots: availableSlots,
        testMode: true
      });
    }

    // Get Google Calendar credentials
    const googleCreds = env.GOOGLE_SERVICE_ACCOUNT;
    
    // Get host email from settings (with fallback to env var)
    const hostEmailSetting = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, 'host_email'))
      .get();
    const calendarEmail = hostEmailSetting?.value || env.GOOGLE_CALENDAR_EMAIL;

    if (!googleCreds || !calendarEmail) {
      console.error('Google Calendar credentials not configured');
      return NextResponse.json(
        { success: false, error: 'Calendar integration not configured', slots: [] },
        { status: 503 }
      );
    }

    // Get availability from Google Calendar (fail closed: do not show slots if calendar is unavailable)
    const logger: GoogleCalendarLogger = async (entry) => {
      try {
        await db.insert(schema.integrationLogs).values({
          ...entry,
          provider: 'google_calendar'
        });
      } catch (e) {
        console.error('Failed to log Google Calendar:', e);
      }
    };

    const calendar = getGoogleCalendarClient(googleCreds, calendarEmail, logger);
    const availableSlotsFromCalendar = await calendar.getAvailability(
      date,
      allSlots,
      hostTimezone,
      (calendarConfig.slotDuration || 30) + (calendarConfig.bufferTime || 0),
      { strict: true }
    );

    // Also exclude any slots that are locked in our DB (race-condition protection)
    const locks = await db
      .select({ scheduledTime: slotLocks.scheduledTime })
      .from(slotLocks)
      .where(eq(slotLocks.scheduledDate, date));
    const locked = new Set(locks.map((l: { scheduledTime: string }) => l.scheduledTime));
    const availableSlots = availableSlotsFromCalendar.filter(s => !locked.has(s));

    return NextResponse.json({
      success: true,
      slots: availableSlots
    });

  } catch (error) {
    console.error('Slots error:', error);
    return NextResponse.json(
      { success: false, error: 'Calendar is temporarily unavailable', slots: [] },
      { status: 503 }
    );
  }
}

// Generate time slots from business hours
function generateSlotsFromBusinessHours(config: typeof DEFAULT_CALENDAR_CONFIG): string[] {
  const slots: string[] = [];
  const { start, end } = config.businessHours;
  const duration = config.slotDuration;
  const buffer = config.bufferTime;
  
  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);
  
  let currentHour = startHour;
  let currentMin = startMin;
  
  while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
    const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
    slots.push(timeStr);
    
    // Add slot duration + buffer
    currentMin += duration + buffer;
    while (currentMin >= 60) {
      currentMin -= 60;
      currentHour++;
    }
  }
  
  return slots;
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
