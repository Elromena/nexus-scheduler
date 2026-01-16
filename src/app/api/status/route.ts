import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    
    // Check authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    if (token !== env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = drizzle(env.DB, { schema });

    // Check test mode from database
    const testModeSetting = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, 'test_mode'))
      .get();

    return NextResponse.json({
      success: true,
      data: {
        testMode: testModeSetting?.value === 'true',
        hubspotConfigured: Boolean(env.HUBSPOT_ACCESS_TOKEN),
        googleServiceAccountConfigured: Boolean(env.GOOGLE_SERVICE_ACCOUNT),
        googleCalendarEmailConfigured: Boolean(env.GOOGLE_CALENDAR_EMAIL),
      },
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
