import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { sql, gte, lte, and, desc } from 'drizzle-orm';
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

    const reportType = searchParams.get('type') || 'leads';
    const startMonth = searchParams.get('startMonth');
    const endMonth = searchParams.get('endMonth');
    const months = parseInt(searchParams.get('months') || '12', 10);

    // Calculate date range
    let startDate: string;
    let endDate: string;
    
    if (startMonth && endMonth) {
      startDate = `${startMonth}-01`;
      const endParts = endMonth.split('-');
      const endYear = parseInt(endParts[0]);
      const endMonthNum = parseInt(endParts[1]);
      const lastDay = new Date(endYear, endMonthNum, 0).getDate();
      endDate = `${endMonth}-${lastDay}`;
    } else {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
      startDate = start.toISOString().split('T')[0];
      endDate = now.toISOString().split('T')[0];
    }

    let csvContent = '';
    let filename = '';

    switch (reportType) {
      case 'leads': {
        const leads = await db
          .select()
          .from(schema.bookings)
          .leftJoin(schema.visitors, sql`${schema.bookings.visitorId} = ${schema.visitors.id}`)
          .where(and(
            gte(schema.bookings.createdAt, startDate),
            lte(schema.bookings.createdAt, endDate)
          ))
          .orderBy(desc(schema.bookings.createdAt));

        // CSV headers
        csvContent = 'Date,First Name,Last Name,Email,Website,Industry,Budget,Referrer,Landing Page,Source,Medium,Campaign,Country,City,Status,Deal Stage\n';
        
        // CSV rows
        for (const row of leads) {
          const b = row.bookings;
          const v = row.visitors;
          csvContent += [
            b.createdAt?.split('T')[0] || '',
            escapeCSV(b.firstName),
            escapeCSV(b.lastName),
            escapeCSV(b.email),
            escapeCSV(b.website),
            escapeCSV(b.industry || ''),
            escapeCSV(b.budget || ''),
            escapeCSV(b.attributionReferrer || 'Direct'),
            escapeCSV(b.attributionLandingPage || ''),
            escapeCSV(b.attributionSource || ''),
            escapeCSV(b.attributionMedium || ''),
            escapeCSV(b.attributionCampaign || ''),
            escapeCSV(v?.country || ''),
            escapeCSV(v?.city || ''),
            escapeCSV(b.status || ''),
            escapeCSV(b.hubspotDealStage || ''),
          ].join(',') + '\n';
        }
        
        filename = `leads-${startDate}-to-${endDate}.csv`;
        break;
      }

      case 'referrers': {
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

        csvContent = 'Month,Referrer,Leads\n';
        for (const row of data) {
          csvContent += [
            row.month,
            escapeCSV(row.referrer || 'Direct'),
            row.count,
          ].join(',') + '\n';
        }
        
        filename = `referrers-${startDate}-to-${endDate}.csv`;
        break;
      }

      case 'landing-pages': {
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

        csvContent = 'Month,Landing Page,Leads\n';
        for (const row of data) {
          csvContent += [
            row.month,
            escapeCSV(row.landingPage || 'Unknown'),
            row.count,
          ].join(',') + '\n';
        }
        
        filename = `landing-pages-${startDate}-to-${endDate}.csv`;
        break;
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

        csvContent = 'Month,Industry,Leads\n';
        for (const row of data) {
          csvContent += [
            row.month,
            escapeCSV(row.industry || 'Unknown'),
            row.count,
          ].join(',') + '\n';
        }
        
        filename = `industries-${startDate}-to-${endDate}.csv`;
        break;
      }

      case 'locations': {
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

        csvContent = 'Month,Country,City,Leads\n';
        for (const row of data) {
          csvContent += [
            row.month,
            escapeCSV(row.country || 'Unknown'),
            escapeCSV(row.city || 'Unknown'),
            row.count,
          ].join(',') + '\n';
        }
        
        filename = `locations-${startDate}-to-${endDate}.csv`;
        break;
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

        csvContent = 'Month,Deal Stage,Leads\n';
        for (const row of data) {
          csvContent += [
            row.month,
            escapeCSV(row.dealStage || 'Not Synced'),
            row.count,
          ].join(',') + '\n';
        }
        
        filename = `deal-stages-${startDate}-to-${endDate}.csv`;
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export report' },
      { status: 500 }
    );
  }
}

function escapeCSV(value: string): string {
  if (!value) return '';
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
