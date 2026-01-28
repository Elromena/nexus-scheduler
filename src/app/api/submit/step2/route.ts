import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { validateStep2 } from '@/lib/utils/validation';
import { getHubSpotClient, type HubSpotLogger } from '@/lib/integrations/hubspot';

export async function POST(request: NextRequest) {
  let step = 'init';
  try {
    step = 'parsing request';
    const body = await request.json();
    const { data, hubspotId, visitorId } = body;

    // Validate step 2 data
    step = 'validating data';
    const validation = validateStep2(data);
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
      console.log('Test mode (step2):', isTestMode);
    }

    // Update HubSpot contact
    step = 'hubspot integration';
    if (!isTestMode && env.HUBSPOT_ACCESS_TOKEN && hubspotId && !hubspotId.startsWith('test-')) {
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
        
        await hubspot.updateContact(hubspotId, {
          what_is_the_goal_for_your_company_brand_main: validData.objective,
          advertising_budget_main: validData.budget,
          lead_type: validData.roleType,
          lifecyclestage: 'marketingqualifiedlead'
        });
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
          step: 2,
          timestamp: new Date().toISOString(),
          metadata: JSON.stringify({
            objective: validData.objective,
            budget: validData.budget,
            roleType: validData.roleType,
          }),
        });
      } catch (trackError) {
        // Don't fail the request if tracking fails, but log it
        const errorMsg = trackError instanceof Error ? trackError.message : 'Unknown error';
        console.error('Failed to track form event (step 2):', errorMsg);
        // Log to integration_logs so it's visible in admin
        try {
          await db.insert(schema.integrationLogs).values({
            provider: 'analytics',
            endpoint: 'formEvents/step2',
            method: 'INSERT',
            status: 500,
            requestBody: JSON.stringify({ visitorId, step: 2 }),
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
        testMode: isTestMode,
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error(`Step 2 error at "${step}":`, errorMessage, errorStack);
    return NextResponse.json(
      { success: false, error: `Failed to process step 2 (${step})`, details: errorMessage },
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
