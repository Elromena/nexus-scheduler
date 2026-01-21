import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { desc, eq, and, gte, lte, sql } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

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

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const visibility = (searchParams.get('visibility') || 'active').toLowerCase(); // active | excluded | all

    const offset = (page - 1) * limit;

    // Build conditions array
    const conditions = [];

    // By default, hide excluded bookings from Leads
    if (visibility === 'excluded') {
      conditions.push(eq(schema.bookings.excludedFromAnalytics, 1));
    } else if (visibility !== 'all') {
      conditions.push(eq(schema.bookings.excludedFromAnalytics, 0));
    }
    
    if (status) {
      conditions.push(eq(schema.bookings.status, status));
    }
    
    if (search) {
      conditions.push(
        sql`(${schema.bookings.email} LIKE ${'%' + search + '%'} OR ${schema.bookings.firstName} LIKE ${'%' + search + '%'} OR ${schema.bookings.lastName} LIKE ${'%' + search + '%'} OR ${schema.bookings.website} LIKE ${'%' + search + '%'})`
      );
    }
    
    if (dateFrom) {
      conditions.push(gte(schema.bookings.createdAt, dateFrom));
    }
    
    if (dateTo) {
      conditions.push(lte(schema.bookings.createdAt, dateTo));
    }

    // Get leads
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const leads = await db
      .select()
      .from(schema.bookings)
      .where(whereClause)
      .orderBy(desc(schema.bookings.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.bookings)
      .where(whereClause);
    
    const total = countResult[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data: {
        leads,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }
      }
    });

  } catch (error) {
    console.error('Leads fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}
