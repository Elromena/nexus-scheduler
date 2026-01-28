import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);

    // Manually create the table if migrations didn't run
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS integration_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        provider TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        status INTEGER,
        request_body TEXT,
        response_body TEXT,
        error_message TEXT,
        duration INTEGER
      );
    `);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_integration_logs_timestamp ON integration_logs(timestamp);`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_integration_logs_provider ON integration_logs(provider);`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_integration_logs_status ON integration_logs(status);`);

    return NextResponse.json({ success: true, message: 'Integration logs table created (or already exists)' });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run migration', details: String(error) },
      { status: 500 }
    );
  }
}
