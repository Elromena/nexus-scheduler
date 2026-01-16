import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

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

    return NextResponse.json({
      success: true,
      data: {
        testMode: env.TEST_MODE === 'true',
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
