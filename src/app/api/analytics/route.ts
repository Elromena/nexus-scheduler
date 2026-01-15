import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { sql, gte, and, eq, desc } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

export const runtime = 'edge';

// Simple auth check
function isAuthorized(request: NextRequest): boolean {
  const { env } = getCloudflareContext();
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) return false;
  
  const token = authHeader.replace('Bearer ', '');
  return token === env.ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB, { schema });
    const { searchParams } = new URL(request.url);

    // Date range (default last 30 days)
    const days = parseInt(searchParams.get('days') || '30', 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();

    // Overview stats
    const [
      totalVisitors,
      totalSessions,
      totalPageViews,
      totalFormOpens,
      totalBookings,
      recentVisitors,
    ] = await Promise.all([
      // Total unique visitors
      db.select({ count: sql<number>`count(*)` })
        .from(schema.visitors)
        .where(gte(schema.visitors.createdAt, startDateStr)),

      // Total sessions
      db.select({ count: sql<number>`count(*)` })
        .from(schema.sessions)
        .where(gte(schema.sessions.startedAt, startDateStr)),

      // Total page views
      db.select({ count: sql<number>`count(*)` })
        .from(schema.pageViews)
        .where(gte(schema.pageViews.timestamp, startDateStr)),

      // Form opens
      db.select({ count: sql<number>`count(*)` })
        .from(schema.formEvents)
        .where(and(
          eq(schema.formEvents.eventType, 'form_opened'),
          gte(schema.formEvents.timestamp, startDateStr)
        )),

      // Total bookings/leads
      db.select({ count: sql<number>`count(*)` })
        .from(schema.bookings)
        .where(gte(schema.bookings.createdAt, startDateStr)),

      // Recent visitors
      db.select()
        .from(schema.visitors)
        .orderBy(desc(schema.visitors.lastSeenAt))
        .limit(10),
    ]);

    // Traffic sources breakdown
    const trafficSources = await db
      .select({
        source: schema.visitors.utmSource,
        count: sql<number>`count(*)`,
      })
      .from(schema.visitors)
      .where(gte(schema.visitors.createdAt, startDateStr))
      .groupBy(schema.visitors.utmSource)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Top referrers
    const topReferrers = await db
      .select({
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
      .limit(10);

    // Top landing pages
    const topLandingPages = await db
      .select({
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
      .limit(10);

    // Device breakdown
    const deviceBreakdown = await db
      .select({
        device: schema.visitors.deviceType,
        count: sql<number>`count(*)`,
      })
      .from(schema.visitors)
      .where(gte(schema.visitors.createdAt, startDateStr))
      .groupBy(schema.visitors.deviceType)
      .orderBy(desc(sql`count(*)`));

    // Country breakdown
    const countryBreakdown = await db
      .select({
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
      .limit(10);

    // Conversion funnel
    const funnelSteps = await db
      .select({
        step: schema.formEvents.step,
        eventType: schema.formEvents.eventType,
        count: sql<number>`count(DISTINCT ${schema.formEvents.visitorId})`,
      })
      .from(schema.formEvents)
      .where(gte(schema.formEvents.timestamp, startDateStr))
      .groupBy(schema.formEvents.step, schema.formEvents.eventType)
      .orderBy(schema.formEvents.step);

    // Calculate conversion rate
    const visitorsCount = totalVisitors[0]?.count || 0;
    const bookingsCount = totalBookings[0]?.count || 0;
    const conversionRate = visitorsCount > 0 
      ? ((bookingsCount / visitorsCount) * 100).toFixed(2) 
      : '0.00';

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          visitors: totalVisitors[0]?.count || 0,
          sessions: totalSessions[0]?.count || 0,
          pageViews: totalPageViews[0]?.count || 0,
          formOpens: totalFormOpens[0]?.count || 0,
          bookings: totalBookings[0]?.count || 0,
          conversionRate: parseFloat(conversionRate),
        },
        trafficSources,
        topReferrers,
        topLandingPages,
        deviceBreakdown,
        countryBreakdown,
        funnelSteps,
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
