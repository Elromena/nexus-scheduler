import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { sql, gte, and, eq, desc, gt } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

export async function GET(request: NextRequest) {
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

    const db = drizzle(env.DB, { schema });
    const { searchParams } = new URL(request.url);

    // Date range (default last 30 days)
    const days = parseInt(searchParams.get('days') || '30', 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();

    // =============================================
    // CORE METRICS
    // =============================================
    const [
      totalVisitors,
      totalSessions,
      totalPageViews,
      totalFormOpens,
      totalBookings,
      newVisitors,
      returningVisitors,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(schema.visitors)
        .where(gte(schema.visitors.createdAt, startDateStr)),

      db.select({ count: sql<number>`count(*)` })
        .from(schema.sessions)
        .where(gte(schema.sessions.startedAt, startDateStr)),

      db.select({ count: sql<number>`count(*)` })
        .from(schema.pageViews)
        .where(gte(schema.pageViews.timestamp, startDateStr)),

      db.select({ count: sql<number>`count(*)` })
        .from(schema.formEvents)
        .where(and(
          eq(schema.formEvents.eventType, 'form_opened'),
          gte(schema.formEvents.timestamp, startDateStr)
        )),

      db.select({ count: sql<number>`count(*)` })
        .from(schema.bookings)
        .where(gte(schema.bookings.createdAt, startDateStr)),

      // New visitors (total_visits = 1)
      db.select({ count: sql<number>`count(*)` })
        .from(schema.visitors)
        .where(and(
          gte(schema.visitors.createdAt, startDateStr),
          eq(schema.visitors.totalVisits, 1)
        )),

      // Returning visitors (total_visits > 1)
      db.select({ count: sql<number>`count(*)` })
        .from(schema.visitors)
        .where(and(
          gte(schema.visitors.createdAt, startDateStr),
          gt(schema.visitors.totalVisits, 1)
        )),
    ]);

    // =============================================
    // ENGAGEMENT METRICS
    // =============================================
    const [
      avgSessionDuration,
      avgPagesPerSession,
      avgTimeOnSite,
      avgScrollDepth,
    ] = await Promise.all([
      // Average session duration
      db.select({ avg: sql<number>`AVG(${schema.sessions.duration})` })
        .from(schema.sessions)
        .where(and(
          gte(schema.sessions.startedAt, startDateStr),
          sql`${schema.sessions.duration} IS NOT NULL`
        )),

      // Average pages per session
      db.select({ avg: sql<number>`AVG(${schema.sessions.pageCount})` })
        .from(schema.sessions)
        .where(gte(schema.sessions.startedAt, startDateStr)),

      // Average time on site
      db.select({ avg: sql<number>`AVG(${schema.visitors.totalTimeOnSite})` })
        .from(schema.visitors)
        .where(and(
          gte(schema.visitors.createdAt, startDateStr),
          sql`${schema.visitors.totalTimeOnSite} > 0`
        )),

      // Average scroll depth
      db.select({ avg: sql<number>`AVG(${schema.pageViews.scrollDepth})` })
        .from(schema.pageViews)
        .where(and(
          gte(schema.pageViews.timestamp, startDateStr),
          sql`${schema.pageViews.scrollDepth} IS NOT NULL`
        )),
    ]);

    // =============================================
    // TRAFFIC & ATTRIBUTION
    // =============================================
    const [
      trafficSources,
      utmMediums,
      utmCampaigns,
      topReferrers,
      topLandingPages,
    ] = await Promise.all([
      // Traffic sources (utm_source)
      db.select({
        source: schema.visitors.utmSource,
        count: sql<number>`count(*)`,
      })
        .from(schema.visitors)
        .where(gte(schema.visitors.createdAt, startDateStr))
        .groupBy(schema.visitors.utmSource)
        .orderBy(desc(sql`count(*)`))
        .limit(10),

      // UTM Mediums
      db.select({
        medium: schema.visitors.utmMedium,
        count: sql<number>`count(*)`,
      })
        .from(schema.visitors)
        .where(and(
          gte(schema.visitors.createdAt, startDateStr),
          sql`${schema.visitors.utmMedium} IS NOT NULL`
        ))
        .groupBy(schema.visitors.utmMedium)
        .orderBy(desc(sql`count(*)`))
        .limit(10),

      // UTM Campaigns
      db.select({
        campaign: schema.visitors.utmCampaign,
        count: sql<number>`count(*)`,
      })
        .from(schema.visitors)
        .where(and(
          gte(schema.visitors.createdAt, startDateStr),
          sql`${schema.visitors.utmCampaign} IS NOT NULL`
        ))
        .groupBy(schema.visitors.utmCampaign)
        .orderBy(desc(sql`count(*)`))
        .limit(10),

      // Top referrers
      db.select({
        referrer: schema.visitors.referrer,
        count: sql<number>`count(*)`,
      })
        .from(schema.visitors)
        .where(and(
          gte(schema.visitors.createdAt, startDateStr),
          sql`${schema.visitors.referrer} IS NOT NULL AND ${schema.visitors.referrer} != ''`
        ))
        .groupBy(schema.visitors.referrer)
        .orderBy(desc(sql`count(*)`))
        .limit(10),

      // Top landing pages
      db.select({
        page: schema.visitors.landingPage,
        count: sql<number>`count(*)`,
      })
        .from(schema.visitors)
        .where(and(
          gte(schema.visitors.createdAt, startDateStr),
          sql`${schema.visitors.landingPage} IS NOT NULL`
        ))
        .groupBy(schema.visitors.landingPage)
        .orderBy(desc(sql`count(*)`))
        .limit(10),
    ]);

    // =============================================
    // DEVICE & LOCATION BREAKDOWNS
    // =============================================
    const [
      deviceBreakdown,
      browserBreakdown,
      osBreakdown,
      countryBreakdown,
      cityBreakdown,
    ] = await Promise.all([
      // Device type
      db.select({
        device: schema.visitors.deviceType,
        count: sql<number>`count(*)`,
      })
        .from(schema.visitors)
        .where(gte(schema.visitors.createdAt, startDateStr))
        .groupBy(schema.visitors.deviceType)
        .orderBy(desc(sql`count(*)`)),

      // Browser
      db.select({
        browser: schema.visitors.browser,
        count: sql<number>`count(*)`,
      })
        .from(schema.visitors)
        .where(and(
          gte(schema.visitors.createdAt, startDateStr),
          sql`${schema.visitors.browser} IS NOT NULL`
        ))
        .groupBy(schema.visitors.browser)
        .orderBy(desc(sql`count(*)`))
        .limit(10),

      // Operating System
      db.select({
        os: schema.visitors.os,
        count: sql<number>`count(*)`,
      })
        .from(schema.visitors)
        .where(and(
          gte(schema.visitors.createdAt, startDateStr),
          sql`${schema.visitors.os} IS NOT NULL`
        ))
        .groupBy(schema.visitors.os)
        .orderBy(desc(sql`count(*)`))
        .limit(10),

      // Country
      db.select({
        country: schema.visitors.country,
        count: sql<number>`count(*)`,
      })
        .from(schema.visitors)
        .where(and(
          gte(schema.visitors.createdAt, startDateStr),
          sql`${schema.visitors.country} IS NOT NULL`
        ))
        .groupBy(schema.visitors.country)
        .orderBy(desc(sql`count(*)`))
        .limit(10),

      // City
      db.select({
        city: schema.visitors.city,
        country: schema.visitors.country,
        count: sql<number>`count(*)`,
      })
        .from(schema.visitors)
        .where(and(
          gte(schema.visitors.createdAt, startDateStr),
          sql`${schema.visitors.city} IS NOT NULL`
        ))
        .groupBy(schema.visitors.city, schema.visitors.country)
        .orderBy(desc(sql`count(*)`))
        .limit(10),
    ]);

    // =============================================
    // CONVERSION FUNNEL & FORM ANALYTICS
    // =============================================
    const [
      funnelSteps,
      formAbandonment,
    ] = await Promise.all([
      // Funnel steps
      db.select({
        step: schema.formEvents.step,
        eventType: schema.formEvents.eventType,
        count: sql<number>`count(DISTINCT ${schema.formEvents.visitorId})`,
      })
        .from(schema.formEvents)
        .where(gte(schema.formEvents.timestamp, startDateStr))
        .groupBy(schema.formEvents.step, schema.formEvents.eventType)
        .orderBy(schema.formEvents.step),

      // Form abandonment by step
      db.select({
        step: schema.formEvents.step,
        count: sql<number>`count(DISTINCT ${schema.formEvents.visitorId})`,
      })
        .from(schema.formEvents)
        .where(and(
          eq(schema.formEvents.eventType, 'form_abandoned'),
          gte(schema.formEvents.timestamp, startDateStr)
        ))
        .groupBy(schema.formEvents.step)
        .orderBy(schema.formEvents.step),
    ]);

    // =============================================
    // RECENT ACTIVITY
    // =============================================
    const recentVisitors = await db.select()
      .from(schema.visitors)
      .orderBy(desc(schema.visitors.lastSeenAt))
      .limit(10);

    // =============================================
    // CALCULATE DERIVED METRICS
    // =============================================
    const visitorsCount = totalVisitors[0]?.count || 0;
    const bookingsCount = totalBookings[0]?.count || 0;
    const formOpensCount = totalFormOpens[0]?.count || 0;
    
    const conversionRate = visitorsCount > 0 
      ? ((bookingsCount / visitorsCount) * 100).toFixed(2) 
      : '0.00';
    
    const formConversionRate = formOpensCount > 0
      ? ((bookingsCount / formOpensCount) * 100).toFixed(2)
      : '0.00';

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          visitors: visitorsCount,
          sessions: totalSessions[0]?.count || 0,
          pageViews: totalPageViews[0]?.count || 0,
          formOpens: formOpensCount,
          bookings: bookingsCount,
          conversionRate: parseFloat(conversionRate),
          formConversionRate: parseFloat(formConversionRate),
          newVisitors: newVisitors[0]?.count || 0,
          returningVisitors: returningVisitors[0]?.count || 0,
        },
        engagement: {
          avgSessionDuration: Math.round(avgSessionDuration[0]?.avg || 0),
          avgPagesPerSession: parseFloat((avgPagesPerSession[0]?.avg || 0).toFixed(1)),
          avgTimeOnSite: Math.round(avgTimeOnSite[0]?.avg || 0),
          avgScrollDepth: Math.round(avgScrollDepth[0]?.avg || 0),
        },
        traffic: {
          sources: trafficSources,
          mediums: utmMediums,
          campaigns: utmCampaigns,
          referrers: topReferrers,
          landingPages: topLandingPages,
        },
        devices: {
          types: deviceBreakdown,
          browsers: browserBreakdown,
          operatingSystems: osBreakdown,
        },
        locations: {
          countries: countryBreakdown,
          cities: cityBreakdown,
        },
        funnel: {
          steps: funnelSteps,
          abandonment: formAbandonment,
        },
        recentVisitors,
        dateRange: {
          days,
          from: startDateStr,
          to: new Date().toISOString(),
        }
      }
    });

  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
