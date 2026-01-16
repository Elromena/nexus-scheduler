import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
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

    return NextResponse.json({
      success: true,
      config: calendarConfig,
    });

  } catch (error) {
    console.error('Calendar config error:', error);
    return NextResponse.json({
      success: true,
      config: DEFAULT_CALENDAR_CONFIG,
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
