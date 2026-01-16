import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq, gte, and, isNull, or } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: 'Email and code are required' },
        { status: 400 }
      );
    }

    const { env } = getCloudflareContext();
    const db = drizzle(env.DB, { schema });
    const now = new Date().toISOString();
    const todayDate = now.split('T')[0];

    // Find valid verification code
    const verificationCode = await db
      .select()
      .from(schema.verificationCodes)
      .where(and(
        eq(schema.verificationCodes.email, email.toLowerCase()),
        eq(schema.verificationCodes.code, code),
        gte(schema.verificationCodes.expiresAt, now),
        isNull(schema.verificationCodes.usedAt)
      ))
      .get();

    if (!verificationCode) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    // Mark code as used
    await db
      .update(schema.verificationCodes)
      .set({ usedAt: now })
      .where(eq(schema.verificationCodes.id, verificationCode.id));

    // Get upcoming bookings for this email
    const bookings = await db
      .select({
        id: schema.bookings.id,
        firstName: schema.bookings.firstName,
        lastName: schema.bookings.lastName,
        email: schema.bookings.email,
        scheduledDate: schema.bookings.scheduledDate,
        scheduledTime: schema.bookings.scheduledTime,
        timezone: schema.bookings.timezone,
        googleMeetLink: schema.bookings.googleMeetLink,
        status: schema.bookings.status,
        createdAt: schema.bookings.createdAt,
      })
      .from(schema.bookings)
      .where(and(
        eq(schema.bookings.email, email.toLowerCase()),
        gte(schema.bookings.scheduledDate, todayDate),
        or(
          eq(schema.bookings.status, 'pending'),
          eq(schema.bookings.status, 'confirmed')
        )
      ))
      .orderBy(schema.bookings.scheduledDate);

    // Generate a session token for subsequent requests
    const sessionToken = Buffer.from(`${email.toLowerCase()}:${Date.now()}`).toString('base64');

    return NextResponse.json({
      success: true,
      sessionToken,
      bookings,
    });

  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify code' },
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
