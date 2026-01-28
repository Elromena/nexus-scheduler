import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { validateStep1 } from '@/lib/utils/validation';
import { getHubSpotClient, type HubSpotLogger } from '@/lib/integrations/hubspot';

export async function POST(request: NextRequest) {
  let step = 'init';
  try {
    step = 'parsing request';
    const body = await request.json();
    const { data, visitorId } = body;

    // Validate step 1 data
    step = 'validating data';
    const validation = validateStep1(data);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const validData = validation.data;
    
    step = 'getting cloudflare context';
    const { env } = getCloudflareContext();
    
    step = 'connecting to database';
    const db = drizzle(env.DB, { schema });

    // Check if test mode - ONLY from database setting
    step = 'checking test mode';
    let isTestMode = false;
    try {
      const testModeSetting = await db
        .select()
        .from(schema.settings)
        .where(eq(schema.settings.key, 'test_mode'))
        .get();
      isTestMode = testModeSetting?.value === 'true';
    } catch (dbError) {
      console.error('Failed to read test_mode setting:', dbError);
      // Continue with test mode = false
    }
    
    if (env.DEBUG_LOGGING === 'true') {
      console.log('Test mode:', isTestMode);
    }

    let hubspotContactId = `test-${Date.now()}`;

    // Create/update contact in HubSpot
    step = 'hubspot integration';
    if (!isTestMode && env.HUBSPOT_ACCESS_TOKEN) {
      try {
        const logger: HubSpotLogger = async (entry) => {
          try {
            await db.insert(schema.integrationLogs).values({
              ...entry,
              provider: 'hubspot'
            });
          } catch (e) {
            console.error('Failed to write to integration_logs:', e);
          }
        };

        const hubspot = getHubSpotClient(env.HUBSPOT_ACCESS_TOKEN, logger);
        
        const contactId = await hubspot.upsertContact(validData.email, {
          email: validData.email,
          firstname: validData.firstName,
          lastname: validData.lastName,
          website: validData.website,
          what_niche_is_the_brand_in___cloned_: validData.industry,
          where_did_you_first_hear_about_us_main: validData.heardFrom,
          lifecyclestage: 'lead'
        });

        if (contactId) {
          hubspotContactId = contactId;
        }
      } catch (error) {
        console.error('HubSpot error:', error);
        // Continue without HubSpot - don't fail the request
      }
    }

    // Track the form event - wrapped in try/catch to not fail the main request
    step = 'tracking form event';
    if (visitorId) {
      try {
        await db.insert(schema.formEvents).values({
          id: `fe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          visitorId,
          sessionId: null,
          eventType: 'step_completed',
          step: 1,
          timestamp: new Date().toISOString(),
          metadata: JSON.stringify({
            email: validData.email,
            industry: validData.industry,
            heardFrom: validData.heardFrom,
          }),
        });
      } catch (trackError) {
        // Don't fail the request if tracking fails, but log it
        const errorMsg = trackError instanceof Error ? trackError.message : 'Unknown error';
        console.error('Failed to track form event (step 1):', errorMsg);
        // Log to integration_logs so it's visible in admin
        try {
          await db.insert(schema.integrationLogs).values({
            provider: 'analytics',
            endpoint: 'formEvents/step1',
            method: 'INSERT',
            status: 500,
            requestBody: JSON.stringify({ visitorId, step: 1 }),
            errorMessage: errorMsg,
          });
        } catch {
          // Last resort - just console log
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        hubspotId: hubspotContactId,
        testMode: isTestMode,
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error(`Step 1 error at "${step}":`, errorMessage, errorStack);
    return NextResponse.json(
      { success: false, error: `Failed to process step 1 (${step})`, details: errorMessage },
      { status: 500 }
    );
  }
}

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
