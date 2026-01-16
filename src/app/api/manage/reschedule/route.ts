import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { getGoogleCalendarClient } from '@/lib/integrations/google-calendar';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, sessionToken, newDate, newTime } = body;

    if (!bookingId || !sessionToken || !newDate || !newTime) {
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

    if (booking.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'This booking cannot be rescheduled' },
        { status: 400 }
      );
    }

    // Get host timezone and email
    const hostTimezoneSetting = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, 'host_timezone'))
      .get();
    const hostEmailSetting = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, 'host_email'))
      .get();

    const hostTimezone = hostTimezoneSetting?.value || 'America/New_York';
    const calendarEmail = hostEmailSetting?.value || env.GOOGLE_CALENDAR_EMAIL;

    // Update Google Calendar event if exists
    if (booking.googleEventId && env.GOOGLE_SERVICE_ACCOUNT && calendarEmail) {
      try {
        const calendar = getGoogleCalendarClient(env.GOOGLE_SERVICE_ACCOUNT, calendarEmail);
        
        // Calculate new times
        const startTime = `${newDate}T${newTime}:00`;
        const [hours, minutes] = newTime.split(':').map(Number);
        const endDate = new Date(2000, 0, 1, hours, minutes + 30);
        const endTime = `${newDate}T${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}:00`;

        await calendar.updateEvent(booking.googleEventId, {
          startTime,
          endTime,
          timeZone: hostTimezone,
        });
      } catch (calError) {
        console.error('Failed to update Google Calendar event:', calError);
        // Continue anyway - database update is more important
      }
    }

    // Update booking in database
    const now = new Date().toISOString();
    await db
      .update(schema.bookings)
      .set({
        scheduledDate: newDate,
        scheduledTime: newTime,
        updatedAt: now,
      })
      .where(eq(schema.bookings.id, bookingId));

    return NextResponse.json({
      success: true,
      message: 'Booking rescheduled successfully',
      booking: {
        id: bookingId,
        scheduledDate: newDate,
        scheduledTime: newTime,
      },
    });

  } catch (error) {
    console.error('Reschedule error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reschedule booking' },
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
