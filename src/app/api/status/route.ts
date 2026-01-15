import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

function isAuthorized(request: NextRequest): boolean {
  const { env } = getCloudflareContext();
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) return false;

  const token = authHeader.replace('Bearer ', '');
  return token === env.ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { env } = getCloudflareContext();

  return NextResponse.json({
    success: true,
    data: {
      testMode: env.TEST_MODE === 'true',
      hubspotConfigured: Boolean(env.HUBSPOT_ACCESS_TOKEN),
      googleServiceAccountConfigured: Boolean(env.GOOGLE_SERVICE_ACCOUNT),
      googleCalendarEmailConfigured: Boolean(env.GOOGLE_CALENDAR_EMAIL),
    },
  });
}
