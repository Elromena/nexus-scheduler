import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq, gte, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import * as schema from '@/lib/db/schema';
import { sendEmail, generateVerificationEmailHTML, generateCode } from '@/lib/integrations/resend';

export async function POST(request: NextRequest) {
  const { env } = getCloudflareContext();
  const debug = env.DEBUG_LOGGING === 'true';
  
  try {
    const body = await request.json();
    const { email } = body;

    console.log(`MANAGE: Send code request for email: ${email}`);

    if (debug) {
      console.log('Send code request:', { email: email?.substring(0, 3) + '***' });
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required' },
        { status: 400 }
      );
    }

    const db = drizzle(env.DB, { schema });

    // Check if email has any upcoming bookings
    const now = new Date().toISOString();
    const todayDate = now.split('T')[0];
    
    if (debug) {
      console.log('Checking bookings:', { email: email.toLowerCase(), todayDate });
    }
    
    const bookings = await db
      .select()
      .from(schema.bookings)
      .where(and(
        eq(schema.bookings.email, email.toLowerCase()),
        gte(schema.bookings.scheduledDate, todayDate),
        eq(schema.bookings.status, 'pending')
      ));

    if (debug) {
      console.log('Found bookings:', { count: bookings.length, bookings: bookings.map(b => ({ id: b.id, date: b.scheduledDate, status: b.status })) });
    }

    if (bookings.length === 0) {
      // Don't reveal if email exists or not for security
      // But still return success to prevent email enumeration
      if (debug) {
        console.log('No upcoming bookings found for email');
      }
      return NextResponse.json({
        success: true,
        message: 'If you have upcoming bookings, you will receive a verification code.',
      });
    }

    // Check for rate limiting - max 3 codes per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    let recentCodes: { id: string }[] = [];
    try {
      recentCodes = await db
        .select({ id: schema.verificationCodes.id })
        .from(schema.verificationCodes)
        .where(and(
          eq(schema.verificationCodes.email, email.toLowerCase()),
          gte(schema.verificationCodes.createdAt, oneHourAgo)
        ));
    } catch (tableError) {
      // Table might not exist yet - that's OK, continue
      if (debug) {
        console.log('verification_codes table check:', tableError);
      }
    }

    if (recentCodes.length >= 3) {
      if (debug) {
        console.log('Rate limit hit:', { recentCodes: recentCodes.length });
      }
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Generate code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    if (debug) {
      console.log('Generated code, storing in DB...');
    }

    // Store code in database
    try {
      await db.insert(schema.verificationCodes).values({
        id: uuidv4(),
        email: email.toLowerCase(),
        code,
        expiresAt,
      });
    } catch (insertError) {
      console.error('Failed to store verification code (table may not exist):', insertError);
      // Continue anyway - we'll still try to send the email
    }

    // Send email via Resend
    const resendApiKey = env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'Email service not configured' },
        { status: 500 }
      );
    }

    if (debug) {
      console.log('Sending email via Resend...');
    }

    const emailResult = await sendEmail(resendApiKey, {
      to: email,
      subject: 'Your Blockchain-Ads Verification Code',
      html: generateVerificationEmailHTML(code),
    });

    if (debug) {
      console.log('Resend result:', emailResult);
    }

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      return NextResponse.json(
        { success: false, error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email.',
    });

  } catch (error) {
    console.error('Send code error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send verification code' },
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
