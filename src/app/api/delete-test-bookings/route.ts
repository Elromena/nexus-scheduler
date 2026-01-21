import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq, inArray, sql } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { slotLocks } from '@/lib/db/slot-locks';

function isAuthorized(request: NextRequest): boolean {
  const { env } = getCloudflareContext();
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '');
  return token === env.ADMIN_PASSWORD;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (body.confirm !== 'DELETE_TEST_BOOKINGS') {
      return NextResponse.json(
        { success: false, error: 'Confirmation required. Send { confirm: \"DELETE_TEST_BOOKINGS\" }' },
        { status: 400 }
      );
    }

    const { env } = getCloudflareContext();
    const db = drizzle(env.DB, { schema });

    // Find test booking IDs
    const rows = await db
      .select({ id: schema.bookings.id })
      .from(schema.bookings)
      .where(eq(schema.bookings.isTest, 1));

    const ids = rows.map(r => r.id).filter(Boolean);

    if (ids.length > 0) {
      // Delete slot locks tied to these bookings (best-effort)
      try {
        await db.delete(slotLocks).where(inArray(slotLocks.id, ids));
      } catch (e) {
        console.error('Failed to delete slot locks for test bookings:', e);
      }
    }

    // Delete the test bookings
    await db.delete(schema.bookings).where(eq(schema.bookings.isTest, 1));

    // Return remaining counts for visibility
    const remaining = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.bookings)
      .where(eq(schema.bookings.isTest, 1));

    return NextResponse.json({
      success: true,
      deletedCount: ids.length,
      remainingTestBookings: remaining[0]?.count || 0,
    });
  } catch (error) {
    console.error('Delete test bookings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete test bookings' },
      { status: 500 }
    );
  }
}

