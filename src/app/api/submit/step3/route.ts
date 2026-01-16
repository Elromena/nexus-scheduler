import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import * as schema from '@/lib/db/schema';
import { validateBooking } from '@/lib/utils/validation';
import { toISODateTime } from '@/lib/utils/dates';
import { getHubSpotClient } from '@/lib/integrations/hubspot';
import { getGoogleCalendarClient, DEFAULT_TIME_SLOTS } from '@/lib/integrations/google-calendar';

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

    // Check if test mode - ONLY from database setting
    const testModeSetting = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, 'test_mode'))
      .get();

    // Use DB setting only (defaults to false if not set)
    const isTestMode = testModeSetting?.value === 'true';
    
    if (env.DEBUG_LOGGING === 'true') {
      console.log('Test mode check (step3):', {
        dbSetting: testModeSetting?.value,
        effectiveTestMode: isTestMode,
      });
    }

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

    // Generate booking ID
    const bookingId = uuidv4();
    let googleMeetLink = '';
    let googleEventId = '';

    // Get host timezone and email from settings
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

    // If not test mode, verify slot is still available and create calendar event
    if (!isTestMode) {
      // Check Google Calendar availability
      if (env.GOOGLE_SERVICE_ACCOUNT && calendarEmail) {
        try {
          const calendar = getGoogleCalendarClient(
            env.GOOGLE_SERVICE_ACCOUNT,
            calendarEmail
          );

          // Verify slot is still available
          const isAvailable = await calendar.isSlotAvailable(validData.date, validData.time);
          if (!isAvailable) {
            return NextResponse.json({
              success: false,
              error: 'Sorry, this time slot was just taken. Please select another time.',
            }, { status: 409 });
          }

          // Create calendar event with Google Meet
          // Format: "2026-01-20T10:30:00" (without UTC suffix, with timezone property)
          const startTime = `${validData.date}T${validData.time}:00`;
          const endTime = (() => {
            const [hours, minutes] = validData.time.split(':').map(Number);
            const endDate = new Date(2000, 0, 1, hours, minutes + 30);
            return `${validData.date}T${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}:00`;
          })();

          // Build calendar event description
          const eventDescription = `Start With Blockchain-Ads Account Strategist

Direct personalized onboarding and assistance for account verification

Note: Access is limited, missed meetings move to the next available window (typically ~30 days).

Need to make changes?
Contact: team@blockchain-ads.com

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
            timeZone: hostTimezone, // Pass the host timezone
          });

          googleEventId = event.id || '';
          googleMeetLink = event.htmlLink || '';

          // Extract Google Meet link from conference data
          if (event.conferenceData?.entryPoints) {
            const meetEntry = event.conferenceData.entryPoints.find(
              ep => ep.entryPointType === 'video'
            );
            if (meetEntry) {
              googleMeetLink = meetEntry.uri;
            }
          }
        } catch (error) {
          console.error('Google Calendar error:', error);
          // Continue without calendar - don't fail the booking
        }
      }

      // Update HubSpot with deal and meeting
      if (env.HUBSPOT_ACCESS_TOKEN && hubspotId && !hubspotId.startsWith('test-')) {
        try {
          const hubspot = getHubSpotClient(env.HUBSPOT_ACCESS_TOKEN);
          const startTime = toISODateTime(validData.date, validData.time);
          const endTime = toISODateTime(validData.date, validData.time, 30);

          await hubspot.processBooking(
            hubspotId,
            {
              website: validData.website,
              objective: validData.objective,
              budget: validData.budget,
              roleType: validData.roleType,
            },
            {
              startTime,
              endTime,
              meetLink: googleMeetLink,
            }
          );
        } catch (error) {
          console.error('HubSpot error:', error);
          // Continue without HubSpot - don't fail the booking
        }
      }
    }

    // Save booking to database
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
      hubspotContactId: hubspotId || null,
      hubspotDealId: null, // Could track this if needed
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
