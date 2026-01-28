import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { getGoogleCalendarClient } from '@/lib/integrations/google-calendar';
import { getHubSpotClient } from '@/lib/integrations/hubspot';
import { slotLocks } from '@/lib/db/slot-locks';

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

    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      return NextResponse.json(
        { success: false, error: 'This booking cannot be rescheduled' },
        { status: 400 }
      );
    }

    // Booking must have a concrete slot to be rescheduled
    if (!booking.scheduledDate || !booking.scheduledTime) {
      return NextResponse.json(
        { success: false, error: 'This booking does not have a scheduled time to reschedule.' },
        { status: 400 }
      );
    }

    // Enforce 2-day rule (Must be at least 2 days after original date)
    const originalDate = new Date(booking.scheduledDate + 'T00:00:00');
    const requestedDate = new Date(newDate + 'T00:00:00');
    const minDate = new Date(originalDate);
    minDate.setDate(originalDate.getDate() + 2);

    if (requestedDate < minDate) {
      return NextResponse.json(
        { success: false, error: 'Rescheduling requires at least 48 hours notice from the original date.' },
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
    const calendarConfigSetting = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, 'calendar_config'))
      .get();

    const hostTimezone = hostTimezoneSetting?.value || 'America/New_York';
    const calendarEmail = hostEmailSetting?.value || env.GOOGLE_CALENDAR_EMAIL;
    let slotDurationMinutes = 30;
    let bufferMinutes = 0;
    if (calendarConfigSetting?.value) {
      try {
        const parsed = JSON.parse(calendarConfigSetting.value);
        slotDurationMinutes = Number(parsed?.slotDuration) || 30;
        bufferMinutes = Number(parsed?.bufferTime) || 0;
      } catch {
        // defaults
      }
    }

    // Require calendar config in live mode for rescheduling too
    if (!env.GOOGLE_SERVICE_ACCOUNT || !calendarEmail || !booking.googleEventId) {
      return NextResponse.json(
        { success: false, error: 'Calendar integration not configured for rescheduling' },
        { status: 503 }
      );
    }

    // Update slot lock first (this will fail if slot is already taken)
    const previousSlot = { date: booking.scheduledDate, time: booking.scheduledTime };

    // Ensure slot lock exists for older bookings created before slot locks were introduced
    try {
      await db.insert(slotLocks).values({
        id: bookingId,
        scheduledDate: previousSlot.date,
        scheduledTime: previousSlot.time,
      });
    } catch {
      // already exists or table not present yet in environment; proceed
    }

    try {
      await db
        .update(slotLocks)
        .set({ scheduledDate: newDate, scheduledTime: newTime })
        .where(eq(slotLocks.id, bookingId));
    } catch {
      return NextResponse.json(
        { success: false, error: 'Sorry, this time slot was just taken. Please select another time.' },
        { status: 409 }
      );
    }

    // Update Google Calendar event (fail closed)
    try {
      const calendar = getGoogleCalendarClient(env.GOOGLE_SERVICE_ACCOUNT, calendarEmail);

      // Verify new slot is actually free on host calendar (includes external meetings)
      const isAvailable = await calendar.isSlotAvailable(
        newDate,
        newTime,
        hostTimezone,
        slotDurationMinutes + bufferMinutes,
        { excludeEventId: booking.googleEventId, strict: true }
      );
      if (!isAvailable) {
        // Roll back lock to previous slot
        await db
          .update(slotLocks)
          .set({ scheduledDate: previousSlot.date, scheduledTime: previousSlot.time })
          .where(eq(slotLocks.id, bookingId));

        return NextResponse.json(
          { success: false, error: 'Sorry, this time slot was just taken. Please select another time.' },
          { status: 409 }
        );
      }

      // Calculate new times
      const startTime = `${newDate}T${newTime}:00`;
      const [hours, minutes] = newTime.split(':').map(Number);
      const endDate = new Date(2000, 0, 1, hours, minutes + slotDurationMinutes);
      const endTime = `${newDate}T${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}:00`;

      await calendar.updateEvent(booking.googleEventId, {
        startTime,
        endTime,
        timeZone: hostTimezone,
      });

      // Update meeting in HubSpot (so reminder workflows use new time)
      if (booking.hubspotMeetingId && env.HUBSPOT_ACCESS_TOKEN) {
        try {
          const hubspot = getHubSpotClient(env.HUBSPOT_ACCESS_TOKEN);
          // Convert to ISO format for HubSpot
          const hubspotStartTime = new Date(`${newDate}T${newTime}:00`).toISOString();
          const hubspotEndTime = new Date(endTime).toISOString();
          await hubspot.rescheduleMeeting(booking.hubspotMeetingId, hubspotStartTime, hubspotEndTime);
          console.log('HubSpot meeting rescheduled:', booking.hubspotMeetingId);
        } catch (hubspotError) {
          console.error('Failed to reschedule HubSpot meeting:', hubspotError);
          // Continue anyway - Google Calendar is the source of truth
        }
      }
    } catch (calError) {
      console.error('Failed to update Google Calendar event:', calError);
      // Roll back lock to previous slot
      try {
        await db
          .update(slotLocks)
          .set({ scheduledDate: previousSlot.date, scheduledTime: previousSlot.time })
          .where(eq(slotLocks.id, bookingId));
      } catch {}

      return NextResponse.json(
        { success: false, error: 'Calendar is temporarily unavailable. Please try again shortly.' },
        { status: 503 }
      );
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
