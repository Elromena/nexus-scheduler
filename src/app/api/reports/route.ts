import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { sql, gte, lte, and, desc } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

// Helper to get month string (YYYY-MM) from date
function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Helper to get last N months as array of YYYY-MM strings
function getLastNMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(getMonthKey(date));
  }
  return months;
}

// Calculate percentage change between two values
function calcChange(current: number, previous: number): { value: number; direction: 'up' | 'down' | 'same' } {
  if (previous === 0) {
    return { value: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'same' };
  }
  const change = ((current - previous) / previous) * 100;
  return {
    value: Math.abs(Math.round(change)),
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'same',
  };
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

    // Report type: overview, referrers, landing-pages, industries, locations, deal-stages
    const reportType = searchParams.get('type') || 'overview';
    
    // Date range parameters
    const months = parseInt(searchParams.get('months') || '12', 10);
    const startMonth = searchParams.get('startMonth'); // YYYY-MM
    const endMonth = searchParams.get('endMonth'); // YYYY-MM
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    // Calculate date range
    let startDate: string;
    let endDate: string;
    
    if (startMonth && endMonth) {
      // Custom range
      startDate = `${startMonth}-01`;
      const endParts = endMonth.split('-');
      const endYear = parseInt(endParts[0]);
      const endMonthNum = parseInt(endParts[1]);
      const lastDay = new Date(endYear, endMonthNum, 0).getDate();
      endDate = `${endMonth}-${lastDay}`;
    } else {
      // Last N months
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
      startDate = start.toISOString().split('T')[0];
      endDate = now.toISOString().split('T')[0];
    }

    // Build response based on report type
    switch (reportType) {
      case 'overview': {
        // Get monthly totals for last N months
        const monthlyData = await db
          .select({
            month: sql<string>`strftime('%Y-%m', ${schema.bookings.createdAt})`,
            count: sql<number>`count(*)`,
          })
          .from(schema.bookings)
          .where(and(
            gte(schema.bookings.createdAt, startDate),
            lte(schema.bookings.createdAt, endDate)
          ))
          .groupBy(sql`strftime('%Y-%m', ${schema.bookings.createdAt})`)
          .orderBy(desc(sql`strftime('%Y-%m', ${schema.bookings.createdAt})`));

        // Add MoM change indicators
        const monthlyWithChange = monthlyData.map((item, index) => {
          const prevMonth = monthlyData[index + 1];
          const change = calcChange(item.count, prevMonth?.count || 0);
          return { ...item, change };
        });

        return NextResponse.json({
          success: true,
          reportType: 'overview',
          data: monthlyWithChange,
          dateRange: { startDate, endDate },
        });
      }

      case 'referrers': {
        // Group by referrer and month
        const data = await db
          .select({
            month: sql<string>`strftime('%Y-%m', ${schema.bookings.createdAt})`,
            referrer: schema.bookings.attributionReferrer,
            count: sql<number>`count(*)`,
          })
          .from(schema.bookings)
          .where(and(
            gte(schema.bookings.createdAt, startDate),
            lte(schema.bookings.createdAt, endDate)
          ))
          .groupBy(
            sql`strftime('%Y-%m', ${schema.bookings.createdAt})`,
            schema.bookings.attributionReferrer
          )
          .orderBy(
            desc(sql`strftime('%Y-%m', ${schema.bookings.createdAt})`),
            desc(sql`count(*)`)
          );

        // Aggregate totals by referrer
        const totals = await db
          .select({
            referrer: schema.bookings.attributionReferrer,
            count: sql<number>`count(*)`,
          })
          .from(schema.bookings)
          .where(and(
            gte(schema.bookings.createdAt, startDate),
            lte(schema.bookings.createdAt, endDate)
          ))
          .groupBy(schema.bookings.attributionReferrer)
          .orderBy(desc(sql`count(*)`))
          .limit(limit)
          .offset(offset);

        // Get total count for pagination
        const totalCount = await db
          .select({ count: sql<number>`count(DISTINCT ${schema.bookings.attributionReferrer})` })
          .from(schema.bookings)
          .where(and(
            gte(schema.bookings.createdAt, startDate),
            lte(schema.bookings.createdAt, endDate)
          ));

        // Calculate MoM changes for each referrer
        const months = getLastNMonths(2);
        const currentMonth = months[0];
        const previousMonth = months[1];

        const totalsWithChange = totals.map((item) => {
          const currentData = data.find(d => d.referrer === item.referrer && d.month === currentMonth);
          const prevData = data.find(d => d.referrer === item.referrer && d.month === previousMonth);
          const change = calcChange(currentData?.count || 0, prevData?.count || 0);
          return { ...item, currentMonth: currentData?.count || 0, previousMonth: prevData?.count || 0, change };
        });

        return NextResponse.json({
          success: true,
          reportType: 'referrers',
          data: totalsWithChange,
          monthlyBreakdown: data,
          pagination: {
            page,
            limit,
            total: totalCount[0]?.count || 0,
            totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
          },
          dateRange: { startDate, endDate },
        });
      }

      case 'landing-pages': {
        // Group by landing page and month
        const data = await db
          .select({
            month: sql<string>`strftime('%Y-%m', ${schema.bookings.createdAt})`,
            landingPage: schema.bookings.attributionLandingPage,
            count: sql<number>`count(*)`,
          })
          .from(schema.bookings)
          .where(and(
            gte(schema.bookings.createdAt, startDate),
            lte(schema.bookings.createdAt, endDate)
          ))
          .groupBy(
            sql`strftime('%Y-%m', ${schema.bookings.createdAt})`,
            schema.bookings.attributionLandingPage
          )
          .orderBy(
            desc(sql`strftime('%Y-%m', ${schema.bookings.createdAt})`),
            desc(sql`count(*)`)
          );

        // Aggregate totals
        const totals = await db
          .select({
            landingPage: schema.bookings.attributionLandingPage,
            count: sql<number>`count(*)`,
          })
          .from(schema.bookings)
          .where(and(
            gte(schema.bookings.createdAt, startDate),
            lte(schema.bookings.createdAt, endDate)
          ))
          .groupBy(schema.bookings.attributionLandingPage)
          .orderBy(desc(sql`count(*)`))
          .limit(limit)
          .offset(offset);

        const totalCount = await db
          .select({ count: sql<number>`count(DISTINCT ${schema.bookings.attributionLandingPage})` })
          .from(schema.bookings)
          .where(and(
            gte(schema.bookings.createdAt, startDate),
            lte(schema.bookings.createdAt, endDate)
          ));

        const months = getLastNMonths(2);
        const currentMonth = months[0];
        const previousMonth = months[1];

        const totalsWithChange = totals.map((item) => {
          const currentData = data.find(d => d.landingPage === item.landingPage && d.month === currentMonth);
          const prevData = data.find(d => d.landingPage === item.landingPage && d.month === previousMonth);
          const change = calcChange(currentData?.count || 0, prevData?.count || 0);
          return { ...item, currentMonth: currentData?.count || 0, previousMonth: prevData?.count || 0, change };
        });

        return NextResponse.json({
          success: true,
          reportType: 'landing-pages',
          data: totalsWithChange,
          monthlyBreakdown: data,
          pagination: {
            page,
            limit,
            total: totalCount[0]?.count || 0,
            totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
          },
          dateRange: { startDate, endDate },
        });
      }

      case 'industries': {
        const data = await db
          .select({
            month: sql<string>`strftime('%Y-%m', ${schema.bookings.createdAt})`,
            industry: schema.bookings.industry,
            count: sql<number>`count(*)`,
          })
          .from(schema.bookings)
          .where(and(
            gte(schema.bookings.createdAt, startDate),
            lte(schema.bookings.createdAt, endDate)
          ))
          .groupBy(
            sql`strftime('%Y-%m', ${schema.bookings.createdAt})`,
            schema.bookings.industry
          )
          .orderBy(
            desc(sql`strftime('%Y-%m', ${schema.bookings.createdAt})`),
            desc(sql`count(*)`)
          );

        const totals = await db
          .select({
            industry: schema.bookings.industry,
            count: sql<number>`count(*)`,
          })
          .from(schema.bookings)
          .where(and(
            gte(schema.bookings.createdAt, startDate),
            lte(schema.bookings.createdAt, endDate)
          ))
          .groupBy(schema.bookings.industry)
          .orderBy(desc(sql`count(*)`))
          .limit(limit)
          .offset(offset);

        const totalCount = await db
          .select({ count: sql<number>`count(DISTINCT ${schema.bookings.industry})` })
          .from(schema.bookings)
          .where(and(
            gte(schema.bookings.createdAt, startDate),
            lte(schema.bookings.createdAt, endDate)
          ));

        const months = getLastNMonths(2);
        const currentMonth = months[0];
        const previousMonth = months[1];

        const totalsWithChange = totals.map((item) => {
          const currentData = data.find(d => d.industry === item.industry && d.month === currentMonth);
          const prevData = data.find(d => d.industry === item.industry && d.month === previousMonth);
          const change = calcChange(currentData?.count || 0, prevData?.count || 0);
          return { ...item, currentMonth: currentData?.count || 0, previousMonth: prevData?.count || 0, change };
        });

        return NextResponse.json({
          success: true,
          reportType: 'industries',
          data: totalsWithChange,
          monthlyBreakdown: data,
          pagination: {
            page,
            limit,
            total: totalCount[0]?.count || 0,
            totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
          },
          dateRange: { startDate, endDate },
        });
      }

      case 'locations': {
        // Join bookings with visitors to get location data
        const data = await db
          .select({
            month: sql<string>`strftime('%Y-%m', ${schema.bookings.createdAt})`,
            country: schema.visitors.country,
            city: schema.visitors.city,
            count: sql<number>`count(*)`,
          })
          .from(schema.bookings)
          .innerJoin(schema.visitors, sql`${schema.bookings.visitorId} = ${schema.visitors.id}`)
          .where(and(
            gte(schema.bookings.createdAt, startDate),
            lte(schema.bookings.createdAt, endDate)
          ))
          .groupBy(
            sql`strftime('%Y-%m', ${schema.bookings.createdAt})`,
            schema.visitors.country,
            schema.visitors.city
          )
          .orderBy(
            desc(sql`strftime('%Y-%m', ${schema.bookings.createdAt})`),
            desc(sql`count(*)`)
          );

        // Country totals
        const countryTotals = await db
          .select({
            country: schema.visitors.country,
            count: sql<number>`count(*)`,
          })
          .from(schema.bookings)
          .innerJoin(schema.visitors, sql`${schema.bookings.visitorId} = ${schema.visitors.id}`)
          .where(and(
            gte(schema.bookings.createdAt, startDate),
            lte(schema.bookings.createdAt, endDate)
          ))
          .groupBy(schema.visitors.country)
          .orderBy(desc(sql`count(*)`))
          .limit(limit)
          .offset(offset);

        // City totals
        const cityTotals = await db
          .select({
            city: schema.visitors.city,
            country: schema.visitors.country,
            count: sql<number>`count(*)`,
          })
          .from(schema.bookings)
          .innerJoin(schema.visitors, sql`${schema.bookings.visitorId} = ${schema.visitors.id}`)
          .where(and(
            gte(schema.bookings.createdAt, startDate),
            lte(schema.bookings.createdAt, endDate)
          ))
          .groupBy(schema.visitors.city, schema.visitors.country)
          .orderBy(desc(sql`count(*)`))
          .limit(limit)
          .offset(offset);

        const totalCount = await db
          .select({ count: sql<number>`count(DISTINCT ${schema.visitors.country})` })
          .from(schema.bookings)
          .innerJoin(schema.visitors, sql`${schema.bookings.visitorId} = ${schema.visitors.id}`)
          .where(and(
            gte(schema.bookings.createdAt, startDate),
            lte(schema.bookings.createdAt, endDate)
          ));

        return NextResponse.json({
          success: true,
          reportType: 'locations',
          data: {
            countries: countryTotals,
            cities: cityTotals,
          },
          monthlyBreakdown: data,
          pagination: {
            page,
            limit,
            total: totalCount[0]?.count || 0,
            totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
          },
          dateRange: { startDate, endDate },
        });
      }

      case 'deal-stages': {
        const data = await db
          .select({
            month: sql<string>`strftime('%Y-%m', ${schema.bookings.createdAt})`,
            dealStage: schema.bookings.hubspotDealStage,
            count: sql<number>`count(*)`,
          })
          .from(schema.bookings)
          .where(and(
            gte(schema.bookings.createdAt, startDate),
            lte(schema.bookings.createdAt, endDate)
          ))
          .groupBy(
            sql`strftime('%Y-%m', ${schema.bookings.createdAt})`,
            schema.bookings.hubspotDealStage
          )
          .orderBy(
            desc(sql`strftime('%Y-%m', ${schema.bookings.createdAt})`),
            desc(sql`count(*)`)
          );

        const totals = await db
          .select({
            dealStage: schema.bookings.hubspotDealStage,
            count: sql<number>`count(*)`,
          })
          .from(schema.bookings)
          .where(and(
            gte(schema.bookings.createdAt, startDate),
            lte(schema.bookings.createdAt, endDate)
          ))
          .groupBy(schema.bookings.hubspotDealStage)
          .orderBy(desc(sql`count(*)`))
          .limit(limit)
          .offset(offset);

        const totalCount = await db
          .select({ count: sql<number>`count(DISTINCT ${schema.bookings.hubspotDealStage})` })
          .from(schema.bookings)
          .where(and(
            gte(schema.bookings.createdAt, startDate),
            lte(schema.bookings.createdAt, endDate)
          ));

        const months = getLastNMonths(2);
        const currentMonth = months[0];
        const previousMonth = months[1];

        const totalsWithChange = totals.map((item) => {
          const currentData = data.find(d => d.dealStage === item.dealStage && d.month === currentMonth);
          const prevData = data.find(d => d.dealStage === item.dealStage && d.month === previousMonth);
          const change = calcChange(currentData?.count || 0, prevData?.count || 0);
          return { ...item, currentMonth: currentData?.count || 0, previousMonth: prevData?.count || 0, change };
        });

        return NextResponse.json({
          success: true,
          reportType: 'deal-stages',
          data: totalsWithChange,
          monthlyBreakdown: data,
          pagination: {
            page,
            limit,
            total: totalCount[0]?.count || 0,
            totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
          },
          dateRange: { startDate, endDate },
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Reports fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch report' },
      { status: 500 }
    );
  }
}
