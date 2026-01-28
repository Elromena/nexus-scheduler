import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { validateStep1 } from '@/lib/utils/validation';
import { getHubSpotClient, type HubSpotLogger } from '@/lib/integrations/hubspot';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, visitorId } = body;

    // Validate step 1 data
    const validation = validateStep1(data);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const validData = validation.data;
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB, { schema });

    // Check if test mode - ONLY from database setting
    const testModeSetting = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, 'test_mode'))
      .get();

    // Use DB setting only (defaults to false if not set)
    const isTestMode = testModeSetting?.value === 'true';
    
    if (env.DEBUG_LOGGING === 'true') {
      console.log('Test mode check:', {
        dbSetting: testModeSetting?.value,
        effectiveTestMode: isTestMode,
      });
    }

    let hubspotContactId = `test-${Date.now()}`;

    // Create/update contact in HubSpot
    if (!isTestMode && env.HUBSPOT_ACCESS_TOKEN) {
      try {
        const logger: HubSpotLogger = async (entry) => {
          try {
            await db.insert(schema.hubspotLogs).values(entry);
          } catch (e) {
            console.error('Failed to write to hubspot_logs:', e);
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

    // Track the form event
    if (visitorId) {
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
    }

    return NextResponse.json({
      success: true,
      data: {
        hubspotId: hubspotContactId,
        testMode: isTestMode,
      }
    });

  } catch (error) {
    console.error('Step 1 error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process step 1' },
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
