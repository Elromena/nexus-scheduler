import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { sql, gte, lte, and, eq, desc, gt, between } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

// Helper function to get date string
function toDateStr(date: Date): string {
  return date.toISOString();
}

// Helper function to calculate metrics for a date range
async function getMetricsForRange(
  db: ReturnType<typeof drizzle>,
  startDate: string,
  endDate: string
) {
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
      .where(and(gte(schema.visitors.createdAt, startDate), lte(schema.visitors.createdAt, endDate))),

    db.select({ count: sql<number>`count(*)` })
      .from(schema.sessions)
      .where(and(gte(schema.sessions.startedAt, startDate), lte(schema.sessions.startedAt, endDate))),

    db.select({ count: sql<number>`count(*)` })
      .from(schema.pageViews)
      .where(and(gte(schema.pageViews.timestamp, startDate), lte(schema.pageViews.timestamp, endDate))),

    db.select({ count: sql<number>`count(*)` })
      .from(schema.formEvents)
      .where(and(
        eq(schema.formEvents.eventType, 'form_opened'),
        gte(schema.formEvents.timestamp, startDate),
        lte(schema.formEvents.timestamp, endDate)
      )),

    db.select({ count: sql<number>`count(*)` })
      .from(schema.bookings)
      .where(and(gte(schema.bookings.createdAt, startDate), lte(schema.bookings.createdAt, endDate))),

    db.select({ count: sql<number>`count(*)` })
      .from(schema.visitors)
      .where(and(
        gte(schema.visitors.createdAt, startDate),
        lte(schema.visitors.createdAt, endDate),
        eq(schema.visitors.totalVisits, 1)
      )),

    db.select({ count: sql<number>`count(*)` })
      .from(schema.visitors)
      .where(and(
        gte(schema.visitors.createdAt, startDate),
        lte(schema.visitors.createdAt, endDate),
        gt(schema.visitors.totalVisits, 1)
      )),
  ]);

  const visitorsCount = totalVisitors[0]?.count || 0;
  const bookingsCount = totalBookings[0]?.count || 0;
  const formOpensCount = totalFormOpens[0]?.count || 0;

  return {
    visitors: visitorsCount,
    sessions: totalSessions[0]?.count || 0,
    pageViews: totalPageViews[0]?.count || 0,
    formOpens: formOpensCount,
    bookings: bookingsCount,
    conversionRate: visitorsCount > 0 ? (bookingsCount / visitorsCount) * 100 : 0,
    formConversionRate: formOpensCount > 0 ? (bookingsCount / formOpensCount) * 100 : 0,
    newVisitors: newVisitors[0]?.count || 0,
    returningVisitors: returningVisitors[0]?.count || 0,
  };
}

// Helper to get daily trend data
async function getDailyTrend(
  db: ReturnType<typeof drizzle>,
  startDate: string,
  endDate: string
) {
  // Get visitors by day
  const visitorsByDay = await db.select({
    date: sql<string>`date(${schema.visitors.createdAt})`,
    count: sql<number>`count(*)`,
  })
    .from(schema.visitors)
    .where(and(gte(schema.visitors.createdAt, startDate), lte(schema.visitors.createdAt, endDate)))
    .groupBy(sql`date(${schema.visitors.createdAt})`)
    .orderBy(sql`date(${schema.visitors.createdAt})`);

  // Get form opens by day
  const formOpensByDay = await db.select({
    date: sql<string>`date(${schema.formEvents.timestamp})`,
    count: sql<number>`count(*)`,
  })
    .from(schema.formEvents)
    .where(and(
      eq(schema.formEvents.eventType, 'form_opened'),
      gte(schema.formEvents.timestamp, startDate),
      lte(schema.formEvents.timestamp, endDate)
    ))
    .groupBy(sql`date(${schema.formEvents.timestamp})`)
    .orderBy(sql`date(${schema.formEvents.timestamp})`);

  // Get bookings by day
  const bookingsByDay = await db.select({
    date: sql<string>`date(${schema.bookings.createdAt})`,
    count: sql<number>`count(*)`,
  })
    .from(schema.bookings)
    .where(and(gte(schema.bookings.createdAt, startDate), lte(schema.bookings.createdAt, endDate)))
    .groupBy(sql`date(${schema.bookings.createdAt})`)
    .orderBy(sql`date(${schema.bookings.createdAt})`);

  // Merge all data into a single array with all dates
  const dateMap = new Map<string, { date: string; visitors: number; formOpens: number; bookings: number }>();
  
  // Fill with all dates in range
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    dateMap.set(dateStr, { date: dateStr, visitors: 0, formOpens: 0, bookings: 0 });
  }

  // Fill in actual data
  for (const row of visitorsByDay) {
    const entry = dateMap.get(row.date);
    if (entry) entry.visitors = row.count;
  }
  for (const row of formOpensByDay) {
    const entry = dateMap.get(row.date);
    if (entry) entry.formOpens = row.count;
  }
  for (const row of bookingsByDay) {
    const entry = dateMap.get(row.date);
    if (entry) entry.bookings = row.count;
  }

  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// Calculate percentage change
function calcChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

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

    // Parse date range params
    const preset = searchParams.get('preset') || 'last30';
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');
    const compare = searchParams.get('compare') === 'true';

    // Calculate date ranges based on preset or custom dates
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    switch (preset) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'last7':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last30':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last90':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 89);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'thisQuarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'allTime':
        startDate = new Date('2020-01-01');
        break;
      case 'custom':
        startDate = customStart ? new Date(customStart) : new Date(now.setDate(now.getDate() - 29));
        startDate.setHours(0, 0, 0, 0);
        if (customEnd) {
          endDate = new Date(customEnd);
          endDate.setHours(23, 59, 59, 999);
        }
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
    }

    const startDateStr = toDateStr(startDate);
    const endDateStr = toDateStr(endDate);

    // Calculate previous period for comparison
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - periodLength);
    const prevStartDateStr = toDateStr(prevStartDate);
    const prevEndDateStr = toDateStr(prevEndDate);

    // Get current period metrics
    const currentMetrics = await getMetricsForRange(db, startDateStr, endDateStr);

    // Get previous period metrics if comparison enabled
    let previousMetrics = null;
    let changes = null;
    if (compare) {
      previousMetrics = await getMetricsForRange(db, prevStartDateStr, prevEndDateStr);
      changes = {
        visitors: calcChange(currentMetrics.visitors, previousMetrics.visitors),
        sessions: calcChange(currentMetrics.sessions, previousMetrics.sessions),
        pageViews: calcChange(currentMetrics.pageViews, previousMetrics.pageViews),
        formOpens: calcChange(currentMetrics.formOpens, previousMetrics.formOpens),
        bookings: calcChange(currentMetrics.bookings, previousMetrics.bookings),
        conversionRate: currentMetrics.conversionRate - previousMetrics.conversionRate, // pp change
      };
    }

    // Get daily trend data
    const trend = await getDailyTrend(db, startDateStr, endDateStr);

    // Get breakdown data for current period
    const [
      trafficSources,
      topReferrers,
      topLandingPages,
      deviceBreakdown,
      browserBreakdown,
      countryBreakdown,
      cityBreakdown,
      funnelSteps,
    ] = await Promise.all([
      // Traffic sources
      db.select({
        source: schema.visitors.utmSource,
        count: sql<number>`count(*)`,
      })
        .from(schema.visitors)
        .where(and(gte(schema.visitors.createdAt, startDateStr), lte(schema.visitors.createdAt, endDateStr)))
        .groupBy(schema.visitors.utmSource)
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
          lte(schema.visitors.createdAt, endDateStr),
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
          lte(schema.visitors.createdAt, endDateStr),
          sql`${schema.visitors.landingPage} IS NOT NULL`
        ))
        .groupBy(schema.visitors.landingPage)
        .orderBy(desc(sql`count(*)`))
        .limit(10),

      // Device type
      db.select({
        device: schema.visitors.deviceType,
        count: sql<number>`count(*)`,
      })
        .from(schema.visitors)
        .where(and(gte(schema.visitors.createdAt, startDateStr), lte(schema.visitors.createdAt, endDateStr)))
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
          lte(schema.visitors.createdAt, endDateStr),
          sql`${schema.visitors.browser} IS NOT NULL`
        ))
        .groupBy(schema.visitors.browser)
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
          lte(schema.visitors.createdAt, endDateStr),
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
          lte(schema.visitors.createdAt, endDateStr),
          sql`${schema.visitors.city} IS NOT NULL`
        ))
        .groupBy(schema.visitors.city, schema.visitors.country)
        .orderBy(desc(sql`count(*)`))
        .limit(10),

      // Funnel steps
      db.select({
        step: schema.formEvents.step,
        eventType: schema.formEvents.eventType,
        count: sql<number>`count(DISTINCT ${schema.formEvents.visitorId})`,
      })
        .from(schema.formEvents)
        .where(and(gte(schema.formEvents.timestamp, startDateStr), lte(schema.formEvents.timestamp, endDateStr)))
        .groupBy(schema.formEvents.step, schema.formEvents.eventType)
        .orderBy(schema.formEvents.step),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        // Period info
        period: {
          preset,
          startDate: startDateStr,
          endDate: endDateStr,
          previousStartDate: compare ? prevStartDateStr : null,
          previousEndDate: compare ? prevEndDateStr : null,
        },
        // Core metrics with optional comparison
        overview: {
          current: currentMetrics,
          previous: previousMetrics,
          changes,
        },
        // Daily trend for charts
        trend,
        // Breakdowns
        traffic: {
          sources: trafficSources,
          referrers: topReferrers,
          landingPages: topLandingPages,
        },
        devices: {
          types: deviceBreakdown,
          browsers: browserBreakdown,
        },
        locations: {
          countries: countryBreakdown,
          cities: cityBreakdown,
        },
        funnel: {
          steps: funnelSteps,
        },
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
