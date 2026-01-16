import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

// Default calendar configuration
const DEFAULT_CALENDAR_CONFIG = {
  availableDays: [1, 2, 3, 4, 5], // Mon-Fri (0=Sun, 1=Mon, etc.)
  businessHours: {
    start: '09:00',
    end: '17:00',
  },
  slotDuration: 30,
  bufferTime: 0,
  blockedDates: [] as string[],
};

export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB, { schema });

    // Get all relevant settings at once
    const settings = await db
      .select()
      .from(schema.settings)
      .where(inArray(schema.settings.key, ['calendar_config', 'host_timezone', 'host_email']));

    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    // Parse calendar config
    let calendarConfig = DEFAULT_CALENDAR_CONFIG;
    if (settingsMap.calendar_config) {
      try {
        calendarConfig = { ...DEFAULT_CALENDAR_CONFIG, ...JSON.parse(settingsMap.calendar_config) };
      } catch {
        // Use default config
      }
    }

    // Get host timezone and email (with fallback to env var for email)
    const hostTimezone = settingsMap.host_timezone || 'America/New_York';
    const hostEmail = settingsMap.host_email || env.GOOGLE_CALENDAR_EMAIL || '';

    return NextResponse.json({
      success: true,
      config: calendarConfig,
      hostTimezone,
      hostEmail,
    });

  } catch (error) {
    console.error('Calendar config error:', error);
    return NextResponse.json({
      success: true,
      config: DEFAULT_CALENDAR_CONFIG,
      hostTimezone: 'America/New_York',
      hostEmail: '',
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
