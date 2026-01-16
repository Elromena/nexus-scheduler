import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { sql } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

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

    // Parse body to check for confirmation
    const body = await request.json();
    if (body.confirm !== 'RESET_ALL_DATA') {
      return NextResponse.json(
        { error: 'Confirmation required. Send { confirm: "RESET_ALL_DATA" }' },
        { status: 400 }
      );
    }

    const db = drizzle(env.DB, { schema });

    // Delete all data from tables (order matters due to foreign keys)
    await db.run(sql`DELETE FROM form_events`);
    await db.run(sql`DELETE FROM page_views`);
    await db.run(sql`DELETE FROM bookings`);
    await db.run(sql`DELETE FROM sessions`);
    await db.run(sql`DELETE FROM visitors`);

    return NextResponse.json({
      success: true,
      message: 'All analytics and booking data has been reset',
    });

  } catch (error) {
    console.error('Reset error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset database' },
      { status: 500 }
    );
  }
}
