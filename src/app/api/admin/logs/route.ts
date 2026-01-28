import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { desc, eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || 'hubspot';
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB, { schema });

    const logs = await db
      .select()
      .from(schema.integrationLogs)
      .where(eq(schema.integrationLogs.provider, provider))
      .orderBy(desc(schema.integrationLogs.timestamp))
      .limit(limit)
      .all();

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
