import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { validateStep2 } from '@/lib/utils/validation';
import { getHubSpotClient, type HubSpotLogger } from '@/lib/integrations/hubspot';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, hubspotId, visitorId } = body;

    // Validate step 2 data
    const validation = validateStep2(data);
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
      console.log('Test mode check (step2):', {
        dbSetting: testModeSetting?.value,
        effectiveTestMode: isTestMode,
      });
    }

    // Update HubSpot contact
    if (!isTestMode && env.HUBSPOT_ACCESS_TOKEN && hubspotId && !hubspotId.startsWith('test-')) {
      try {
        const logger: HubSpotLogger = async (entry) => {
          try {
            await db.insert(schema.hubspotLogs).values(entry);
          } catch (e) {
            console.error('Failed to write to hubspot_logs:', e);
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

    // Track the form event
    if (visitorId) {
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
    }

    return NextResponse.json({
      success: true,
      data: {
        testMode: isTestMode,
      }
    });

  } catch (error) {
    console.error('Step 2 error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process step 2' },
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
