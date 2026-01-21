import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq, inArray, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import * as schema from '@/lib/db/schema';
import { validateBooking } from '@/lib/utils/validation';
import { toISODateTime } from '@/lib/utils/dates';
import { getHubSpotClient } from '@/lib/integrations/hubspot';
import { getGoogleCalendarClient } from '@/lib/integrations/google-calendar';
import { slotLocks } from '@/lib/db/slot-locks';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, hubspotId, visitorId } = body;

    // Validate all booking data
    const validation = validateBooking(data);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const validData = validation.data;
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB, { schema });
    const now = new Date().toISOString();

    // Check if test mode
    const testModeSetting = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, 'test_mode'))
      .get();
    const isTestMode = testModeSetting?.value === 'true';
    
    // Get visitor attribution data
    let attribution: {
      source: string | null;
      medium: string | null;
      campaign: string | null;
      landingPage: string | null;
      referrer: string | null;
    } = {
      source: null,
      medium: null,
      campaign: null,
      landingPage: null,
      referrer: null,
    };

    if (visitorId) {
      const visitor = await db
        .select()
        .from(schema.visitors)
        .where(eq(schema.visitors.id, visitorId))
        .get();

      if (visitor) {
        attribution = {
          source: visitor.utmSource,
          medium: visitor.utmMedium,
          campaign: visitor.utmCampaign,
          landingPage: visitor.landingPage,
          referrer: visitor.referrer,
        };
      }
    }

    const bookingId = uuidv4();
    let googleMeetLink = '';
    let googleEventId = '';
    let hubspotDealId: string | null = null;
    let hubspotMeetingId: string | null = null;

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

    if (!isTestMode) {
      // Hard requirement in live mode: calendar must be configured so we never double-book.
      if (!env.GOOGLE_SERVICE_ACCOUNT || !calendarEmail) {
        return NextResponse.json(
          { success: false, error: 'Calendar integration not configured. Cannot accept bookings in live mode.' },
          { status: 503 }
        );
      }

      // First, enforce scheduler-level slot lock to prevent race-condition double booking
      try {
        await db.insert(slotLocks).values({
          id: bookingId,
          scheduledDate: validData.date,
          scheduledTime: validData.time,
        });
      } catch {
        return NextResponse.json(
          { success: false, error: 'Sorry, this time slot was just taken. Please select another time.' },
          { status: 409 }
        );
      }

      // Then verify against the host's Google Calendar (includes external meetings)
      const calendar = getGoogleCalendarClient(env.GOOGLE_SERVICE_ACCOUNT, calendarEmail);
      try {
        const isAvailable = await calendar.isSlotAvailable(
          validData.date,
          validData.time,
          hostTimezone,
          slotDurationMinutes + bufferMinutes,
          { strict: true }
        );
        if (!isAvailable) {
          await db.delete(slotLocks).where(eq(slotLocks.id, bookingId));
          return NextResponse.json(
            { success: false, error: 'Sorry, this time slot was just taken. Please select another time.' },
            { status: 409 }
          );
        }

        const startTime = `${validData.date}T${validData.time}:00`;
        const [hours, minutes] = validData.time.split(':').map(Number);
        const endDate = new Date(2000, 0, 1, hours, minutes + slotDurationMinutes);
        const endTime = `${validData.date}T${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}:00`;

        const eventDescription = `Start With Blockchain-Ads Account Strategist
Direct personalized onboarding and assistance for account verification

Need to make changes?
Reschedule or Cancel: https://www.blockchain-ads.com/scheduler/manage

─────────────────────────
• Name: ${validData.firstName} ${validData.lastName}
• Email: ${validData.email}
• Website: ${validData.website}
• Industry: ${validData.industry}
• Budget: ${validData.budget}
• Objective: ${validData.objective}`;

        const event = await calendar.createEvent({
          summary: `Blockchain-Ads Account Verification`,
          description: eventDescription,
          startTime,
          endTime,
          attendeeEmail: validData.email,
          timeZone: hostTimezone,
        });

        googleEventId = event.id || '';
        googleMeetLink = event.htmlLink || '';

        if (event.conferenceData?.entryPoints) {
          const meetEntry = event.conferenceData.entryPoints.find(ep => ep.entryPointType === 'video');
          if (meetEntry) googleMeetLink = meetEntry.uri;
        }
      } catch (error) {
        console.error('Google Calendar error:', error);
        // Fail closed: release lock and reject booking
        await db.delete(slotLocks).where(eq(slotLocks.id, bookingId));
        return NextResponse.json(
          { success: false, error: 'Calendar is temporarily unavailable. Please try again shortly.' },
          { status: 503 }
        );
      }

      // HubSpot Integration
      if (env.HUBSPOT_ACCESS_TOKEN && hubspotId && !hubspotId.startsWith('test-')) {
        try {
          const hubspot = getHubSpotClient(env.HUBSPOT_ACCESS_TOKEN);
          const startTime = toISODateTime(validData.date, validData.time);
          const endTime = toISODateTime(validData.date, validData.time, 30);

          const result = await hubspot.processBooking(
            hubspotId,
            {
              firstName: validData.firstName,
              lastName: validData.lastName,
              website: validData.website,
              objective: validData.objective,
              budget: validData.budget,
              roleType: validData.roleType,
              industry: validData.industry,
            },
            {
              startTime,
              endTime,
              meetLink: googleMeetLink,
            }
          );
          
          if (result.dealId) hubspotDealId = result.dealId;
          if (result.meetingId) hubspotMeetingId = result.meetingId;
        } catch (error) {
          console.error('HubSpot error:', error);
        }
      }
    }

    // Save booking to database - INCLUDES HubSpot IDs now
    try {
      // Additional safety: if another booking already exists for this date/time, reject
      const existing = await db
        .select({ id: schema.bookings.id })
        .from(schema.bookings)
        .where(and(
          inArray(schema.bookings.status, ['pending', 'confirmed']),
          eq(schema.bookings.scheduledDate, validData.date),
          eq(schema.bookings.scheduledTime, validData.time),
        ))
        .get();

      if (existing) {
        await db.delete(slotLocks).where(eq(slotLocks.id, bookingId));
        return NextResponse.json(
          { success: false, error: 'Sorry, this time slot was just taken. Please select another time.' },
          { status: 409 }
        );
      }

      await db.insert(schema.bookings).values({
        id: bookingId,
        visitorId: visitorId || null,
        firstName: validData.firstName,
        lastName: validData.lastName,
        email: validData.email,
        website: validData.website,
        industry: validData.industry,
        heardFrom: validData.heardFrom,
        objective: validData.objective,
        budget: validData.budget,
        roleType: validData.roleType,
        scheduledDate: validData.date,
        scheduledTime: validData.time,
        timezone: validData.timezone || null,
        isTest: isTestMode ? 1 : 0,
        hubspotContactId: hubspotId || null,
        hubspotDealId: hubspotDealId,
        hubspotMeetingId: hubspotMeetingId,
        googleEventId: googleEventId || null,
        googleMeetLink: googleMeetLink || null,
        status: 'confirmed',
        attributionSource: attribution.source,
        attributionMedium: attribution.medium,
        attributionCampaign: attribution.campaign,
        attributionLandingPage: attribution.landingPage,
        attributionReferrer: attribution.referrer,
        createdAt: now,
        updatedAt: now,
      });
    } catch (dbError) {
      console.error('Failed to save booking:', dbError);
      // Release lock so the slot is not stuck
      if (!isTestMode) {
        await db.delete(slotLocks).where(eq(slotLocks.id, bookingId));
      }
      return NextResponse.json(
        { success: false, error: 'Failed to complete booking' },
        { status: 500 }
      );
    }

    // Track the form submission event
    if (visitorId) {
      await db.insert(schema.formEvents).values({
        id: `fe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        visitorId,
        sessionId: null,
        eventType: 'form_submitted',
        step: 3,
        timestamp: now,
        metadata: JSON.stringify({
          bookingId,
          date: validData.date,
          time: validData.time,
        }),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        bookingId,
        scheduledDate: validData.date,
        scheduledTime: validData.time,
        googleMeetLink: googleMeetLink || null,
        testMode: isTestMode,
      }
    });

  } catch (error) {
    console.error('Step 3 error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete booking' },
      { status: 500 }
    );
  }
}

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
