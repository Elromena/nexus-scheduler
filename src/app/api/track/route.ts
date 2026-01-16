import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import * as schema from '@/lib/db/schema';
import { getGeoFromHeaders, anonymizeIP, getCountryName, inferCountryFromTimezone } from '@/lib/utils/geo';
import { validateTrackingEvent } from '@/lib/utils/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the tracking event
    const validation = validateTrackingEvent(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid tracking data' },
        { status: 400 }
      );
    }

    const event = validation.data;
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB, { schema });

    // Get geo data from Cloudflare headers
    const debugMode = env.DEBUG_LOGGING === 'true';
    const geo = getGeoFromHeaders(request.headers, debugMode);
    const now = new Date().toISOString();
    
    // Use client timezone as additional fallback for country detection
    const clientTimezone = typeof event.data?.clientTimezone === 'string' ? event.data.clientTimezone : null;
    if (clientTimezone && geo.countryCode === 'US') {
      // If server says US but client timezone suggests otherwise, use client timezone
      const inferredCountry = inferCountryFromTimezone(clientTimezone);
      if (inferredCountry && inferredCountry !== 'US') {
        if (debugMode) {
          console.log(`Country override: Server said US, client timezone "${clientTimezone}" suggests "${inferredCountry}"`);
        }
        geo.countryCode = inferredCountry;
        geo.country = inferredCountry;
      }
    }
    
    // Also use client timezone if server has no timezone
    if (clientTimezone && !geo.timezone) {
      geo.timezone = clientTimezone;
    }
    
    // Check if visitor exists
    let visitor = await db
      .select()
      .from(schema.visitors)
      .where(eq(schema.visitors.id, event.visitorId))
      .get();

    // Helper to check if URL is an internal scheduler/system page
    const isInternalPage = (url: string | null): boolean => {
      if (!url) return false;
      const path = url.toLowerCase();
      return path.includes('/scheduler') || 
             path.includes('/verification') || 
             path.includes('/thank-you') ||
             path.includes('/admin');
    };

    if (!visitor) {
      // Create new visitor
      const deviceData = event.data.device || {};
      const utmData = event.data.firstTouchUtm || event.data.utm || {};
      
      // Don't use scheduler/internal pages as landing page
      let landingPage = event.data.landingPage || event.data.url || null;
      if (isInternalPage(landingPage)) {
        landingPage = null; // Will be filled in later when they visit a real page
      }
      
      // Only store external referrer
      let referrer = event.data.referrer || null;
      if (referrer) {
        try {
          const referrerHost = new URL(referrer).hostname;
          const currentHost = event.data.url ? new URL(event.data.url).hostname : '';
          // If referrer is same domain, don't store it
          if (referrerHost === currentHost || referrerHost.includes(currentHost) || currentHost.includes(referrerHost)) {
            referrer = null;
          }
        } catch (e) {
          // Keep referrer if URL parsing fails
        }
      }
      
      visitor = {
        id: event.visitorId,
        fingerprint: event.fingerprint,
        referrer: referrer,
        utmSource: utmData.source || null,
        utmMedium: utmData.medium || null,
        utmCampaign: utmData.campaign || null,
        utmTerm: utmData.term || null,
        utmContent: utmData.content || null,
        landingPage: landingPage,
        userAgent: deviceData.userAgent || null,
        deviceType: deviceData.deviceType || null,
        browser: deviceData.browser || null,
        browserVersion: deviceData.browserVersion || null,
        os: deviceData.os || null,
        osVersion: deviceData.osVersion || null,
        screenResolution: deviceData.screenResolution || null,
        ipAddress: anonymizeIP(geo.ip),
        country: getCountryName(geo.countryCode),
        countryCode: geo.countryCode,
        city: geo.city,
        region: geo.region,
        timezone: geo.timezone,
        firstSeenAt: now,
        lastSeenAt: now,
        totalVisits: 1,
        totalPageViews: 0,
        totalTimeOnSite: 0,
        createdAt: now,
      };

      await db.insert(schema.visitors).values(visitor);
    } else {
      // Update existing visitor - but also backfill missing attribution
      const updates: Record<string, unknown> = {
        lastSeenAt: now,
        totalVisits: (visitor.totalVisits || 0) + (event.isNewSession ? 1 : 0),
      };
      
      // Backfill landing page if missing and current page is NOT internal
      if (!visitor.landingPage && event.data.landingPage && !isInternalPage(event.data.landingPage)) {
        updates.landingPage = event.data.landingPage;
      }
      
      // Backfill referrer if missing and we have an external referrer
      if (!visitor.referrer && event.data.referrer) {
        try {
          const referrerHost = new URL(event.data.referrer).hostname;
          const currentHost = event.data.url ? new URL(event.data.url).hostname : '';
          if (referrerHost !== currentHost && !referrerHost.includes(currentHost) && !currentHost.includes(referrerHost)) {
            updates.referrer = event.data.referrer;
          }
        } catch (e) {}
      }
      
      // Backfill UTM if missing
      const utmData = event.data.firstTouchUtm || event.data.utm || {};
      if (!visitor.utmSource && utmData.source) updates.utmSource = utmData.source;
      if (!visitor.utmMedium && utmData.medium) updates.utmMedium = utmData.medium;
      if (!visitor.utmCampaign && utmData.campaign) updates.utmCampaign = utmData.campaign;
      
      await db
        .update(schema.visitors)
        .set(updates)
        .where(eq(schema.visitors.id, event.visitorId));
    }

    // Handle session
    if (event.isNewSession) {
      const utmData = event.data.utm || {};
      
      // Check if session already exists to avoid UNIQUE constraint error
      const existingSession = await db
        .select({ id: schema.sessions.id })
        .from(schema.sessions)
        .where(eq(schema.sessions.id, event.sessionId))
        .get();

      if (!existingSession) {
        await db.insert(schema.sessions).values({
          id: event.sessionId,
          visitorId: event.visitorId,
          startedAt: now,
          pageCount: 1,
          entryPage: event.data.url || null,
          referrer: event.data.referrer || null,
          utmSource: utmData.source || null,
          utmMedium: utmData.medium || null,
          utmCampaign: utmData.campaign || null,
        });
      }
    } else {
      // Update session
      await db
        .update(schema.sessions)
        .set({
          pageCount: (visitor?.totalPageViews || 0) + 1,
          exitPage: event.data.url || null,
        })
        .where(eq(schema.sessions.id, event.sessionId));
    }

    // Handle specific event types
    switch (event.event) {
      case 'page_view':
        // Increment page view count
        await db
          .update(schema.visitors)
          .set({
            totalPageViews: (visitor?.totalPageViews || 0) + 1,
          })
          .where(eq(schema.visitors.id, event.visitorId));

        // Record page view
        await db.insert(schema.pageViews).values({
          id: uuidv4(),
          visitorId: event.visitorId,
          sessionId: event.sessionId,
          pageUrl: event.data.url || '',
          pageTitle: event.data.title || null,
          timestamp: now,
          timeOnPage: null,
          scrollDepth: null,
        });
        break;

      case 'page_leave':
        // Update the last page view with time on page and scroll depth
        const timeOnPage = event.data.timeOnPage || 0;
        const scrollDepth = event.data.scrollDepth || 0;
        
        // Update visitor's total time on site
        await db
          .update(schema.visitors)
          .set({
            totalTimeOnSite: (visitor?.totalTimeOnSite || 0) + timeOnPage,
          })
          .where(eq(schema.visitors.id, event.visitorId));

        // Update session duration
        await db
          .update(schema.sessions)
          .set({
            endedAt: now,
            duration: timeOnPage,
          })
          .where(eq(schema.sessions.id, event.sessionId));
        break;

      case 'form_opened':
      case 'step_started':
      case 'step_completed':
      case 'form_submitted':
      case 'form_abandoned':
        // Record form event
        await db.insert(schema.formEvents).values({
          id: uuidv4(),
          visitorId: event.visitorId,
          sessionId: event.sessionId,
          eventType: event.event,
          step: event.data.step ?? null,
          timestamp: now,
          metadata: JSON.stringify(event.data),
        });
        break;
    }

    return NextResponse.json({
      success: true,
      visitorId: event.visitorId,
      sessionId: event.sessionId,
    });

  } catch (error) {
    console.error('Tracking error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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
