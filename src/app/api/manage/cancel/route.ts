import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { getGoogleCalendarClient } from '@/lib/integrations/google-calendar';
import { slotLocks } from '@/lib/db/slot-locks';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, sessionToken, reason } = body;

    if (!bookingId || !sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate session token format
    let email: string;
    try {
      const decoded = Buffer.from(sessionToken, 'base64').toString('utf-8');
      email = decoded.split(':')[0];
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    const { env } = getCloudflareContext();
    const db = drizzle(env.DB, { schema });

    // Get the booking and verify ownership
    const booking = await db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.id, bookingId))
      .get();

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (booking.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'This booking is already cancelled' },
        { status: 400 }
      );
    }

    // Get host email for calendar
    const hostEmailSetting = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, 'host_email'))
      .get();
    const calendarEmail = hostEmailSetting?.value || env.GOOGLE_CALENDAR_EMAIL;

    // Delete Google Calendar event if exists
    if (booking.googleEventId && env.GOOGLE_SERVICE_ACCOUNT && calendarEmail) {
      try {
        const calendar = getGoogleCalendarClient(env.GOOGLE_SERVICE_ACCOUNT, calendarEmail);
        await calendar.deleteEvent(booking.googleEventId);
      } catch (calError) {
        console.error('Failed to delete Google Calendar event:', calError);
        // Continue anyway - database update is more important
      }
    }

    // Release slot lock so the slot can be re-booked
    try {
      await db.delete(slotLocks).where(eq(slotLocks.id, bookingId));
    } catch (lockError) {
      console.error('Failed to delete slot lock:', lockError);
    }

    // Update booking status in database
    const now = new Date().toISOString();
    await db
      .update(schema.bookings)
      .set({
        status: 'cancelled',
        updatedAt: now,
      })
      .where(eq(schema.bookings.id, bookingId));

    // Log the cancellation reason if provided
    if (reason) {
      console.log(`Booking ${bookingId} cancelled. Reason: ${reason}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully',
    });

  } catch (error) {
    console.error('Cancel error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel booking' },
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
