import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq, gte, inArray, lte, or, sql } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

function isAuthorized(request: NextRequest): boolean {
  const { env } = getCloudflareContext();
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '');
  return token === env.ADMIN_PASSWORD;
}

function normalizeEmail(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  const v = s.trim().toLowerCase();
  return v.includes('@') ? v : null;
}

function normalizeDomain(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  let v = s.trim().toLowerCase();
  if (!v) return null;
  v = v.replace(/^@/, '');
  if (v.includes('/')) v = v.split('/')[0];
  if (!v.includes('.')) return null;
  return v;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const dryRun = body.dryRun === true;
    const confirm = body.confirm;

    // For apply, require explicit confirmation
    if (!dryRun && confirm !== 'EXCLUDE_INTERNAL_BOOKINGS') {
      return NextResponse.json(
        { success: false, error: 'Confirmation required. Send { confirm: \"EXCLUDE_INTERNAL_BOOKINGS\" }' },
        { status: 400 }
      );
    }

    const emails: string[] = Array.isArray(body.emails) ? body.emails.map(normalizeEmail).filter(Boolean) as string[] : [];
    const domains: string[] = Array.isArray(body.domains) ? body.domains.map(normalizeDomain).filter(Boolean) as string[] : [];

    const createdFrom = typeof body.createdFrom === 'string' ? body.createdFrom : null; // ISO date or datetime
    const createdTo = typeof body.createdTo === 'string' ? body.createdTo : null;

    if (emails.length === 0 && domains.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Provide at least one email or domain.' },
        { status: 400 }
      );
    }

    const { env } = getCloudflareContext();
    const db = drizzle(env.DB, { schema });

    const matchConditions = [];
    if (emails.length) {
      matchConditions.push(inArray(schema.bookings.email, emails));
    }
    if (domains.length) {
      const domainConds = domains.map((d) =>
        sql`lower(${schema.bookings.email}) LIKE ${'%@' + d}`
      );
      matchConditions.push(or(...domainConds));
    }

    const whereConds = [
      // only affect non-test bookings unless explicitly asked (keep separate tooling)
      eq(schema.bookings.isTest, 0),
      or(...matchConditions),
    ];
    if (createdFrom) whereConds.push(gte(schema.bookings.createdAt, createdFrom));
    if (createdTo) whereConds.push(lte(schema.bookings.createdAt, createdTo));

    const where = and(...whereConds);

    const preview = await db
      .select({
        id: schema.bookings.id,
        email: schema.bookings.email,
        createdAt: schema.bookings.createdAt,
        excluded: schema.bookings.excludedFromAnalytics,
      })
      .from(schema.bookings)
      .where(where)
      .limit(20);

    const count = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.bookings)
      .where(where);

    const total = count[0]?.count || 0;

    if (dryRun) {
      return NextResponse.json({
        success: true,
        totalMatched: total,
        sample: preview,
      });
    }

    await db
      .update(schema.bookings)
      .set({ excludedFromAnalytics: 1 })
      .where(where);

    return NextResponse.json({
      success: true,
      updatedCount: total,
      sample: preview,
    });
  } catch (error) {
    console.error('Exclude bookings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to exclude bookings' },
      { status: 500 }
    );
  }
}

