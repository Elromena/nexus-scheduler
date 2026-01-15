import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { desc, eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

function isAuthorized(request: NextRequest): boolean {
  const { env } = getCloudflareContext();
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) return false;

  const token = authHeader.replace('Bearer ', '');
  return token === env.ADMIN_PASSWORD;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB, { schema });
    const { id: leadId } = await context.params;

    const booking = await db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.id, leadId))
      .get();

    if (!booking) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const visitor = booking.visitorId
      ? await db
          .select()
          .from(schema.visitors)
          .where(eq(schema.visitors.id, booking.visitorId))
          .get()
      : null;

    const sessions = booking.visitorId
      ? await db
          .select()
          .from(schema.sessions)
          .where(eq(schema.sessions.visitorId, booking.visitorId))
          .orderBy(desc(schema.sessions.startedAt))
          .limit(50)
      : [];

    const pageViews = booking.visitorId
      ? await db
          .select()
          .from(schema.pageViews)
          .where(eq(schema.pageViews.visitorId, booking.visitorId))
          .orderBy(desc(schema.pageViews.timestamp))
          .limit(200)
      : [];

    const formEvents = booking.visitorId
      ? await db
          .select()
          .from(schema.formEvents)
          .where(eq(schema.formEvents.visitorId, booking.visitorId))
          .orderBy(desc(schema.formEvents.timestamp))
          .limit(200)
      : [];

    return NextResponse.json({
      success: true,
      data: {
        booking,
        visitor,
        sessions,
        pageViews,
        formEvents,
      },
    });
  } catch (error) {
    console.error('Lead details error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lead details' },
      { status: 500 }
    );
  }
}
