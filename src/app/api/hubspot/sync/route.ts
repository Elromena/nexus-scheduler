import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq, isNotNull, sql } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    
    // Auth check
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    if (token !== env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hubspotToken = env.HUBSPOT_ACCESS_TOKEN;
    if (!hubspotToken) {
      return NextResponse.json(
        { error: 'HubSpot not configured' },
        { status: 400 }
      );
    }

    const db = drizzle(env.DB, { schema });
    const { backfill } = await request.json().catch(() => ({}));

    // If backfill is requested, try to find deal IDs for bookings that don't have them
    if (backfill) {
      const bookingsToBackfill = await db
        .select({ id: schema.bookings.id, email: schema.bookings.email })
        .from(schema.bookings)
        .where(isNull(schema.bookings.hubspotDealId));

      if (bookingsToBackfill.length > 0) {
        for (const booking of bookingsToBackfill) {
          try {
            // Search HubSpot for deals by contact email
            const searchRes = await fetch(
              'https://api.hubapi.com/crm/v3/objects/deals/search',
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${hubspotToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  filterGroups: [{
                    filters: [{
                      propertyName: 'associations.contact',
                      operator: 'EQ',
                      value: booking.email // Note: HubSpot search usually requires contact ID, but we'll try to find associated deals
                    }]
                  }],
                  properties: ['dealstage'],
                  limit: 1
                }),
              }
            );
            
            // This is a complex search. A simpler way is to fetch the contact by email first.
            const contactRes = await fetch(
              `https://api.hubapi.com/crm/v3/objects/contacts/${booking.email}?idProperty=email&associations=deals`,
              {
                headers: {
                  'Authorization': `Bearer ${hubspotToken}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (contactRes.ok) {
              const contactData = await contactRes.json();
              const deals = contactData.associations?.deals?.results;
              if (deals && deals.length > 0) {
                const dealId = deals[0].id;
                await db.update(schema.bookings)
                  .set({ hubspotDealId: dealId })
                  .where(eq(schema.bookings.id, booking.id));
              }
            }
          } catch (e) {
            console.error(`Backfill failed for ${booking.email}:`, e);
          }
        }
      }
    }

    // Get all bookings with HubSpot deal IDs (including newly backfilled ones)
    const bookingsWithDeals = await db
      .select({
        id: schema.bookings.id,
        hubspotDealId: schema.bookings.hubspotDealId,
      })
      .from(schema.bookings)
      .where(isNotNull(schema.bookings.hubspotDealId));

    if (bookingsWithDeals.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No bookings with HubSpot deals to sync',
        synced: 0,
      });
    }

    // Fetch deal stages from HubSpot for each deal
    const syncResults = {
      total: bookingsWithDeals.length,
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    // First, get the deal pipeline stages to map stage IDs to names
    let stageMap: Record<string, string> = {};
    try {
      const pipelinesRes = await fetch(
        'https://api.hubapi.com/crm/v3/pipelines/deals',
        {
          headers: {
            'Authorization': `Bearer ${hubspotToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (pipelinesRes.ok) {
        const pipelinesData = await pipelinesRes.json();
        // Build a map of stageId -> stageName
        for (const pipeline of pipelinesData.results || []) {
          for (const stage of pipeline.stages || []) {
            stageMap[stage.id] = stage.label;
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch HubSpot pipelines:', err);
    }

    // Batch deals into groups of 100 for batch API
    const dealIds = bookingsWithDeals
      .map(b => b.hubspotDealId)
      .filter(Boolean) as string[];
    
    const batchSize = 100;
    const now = new Date().toISOString();

    for (let i = 0; i < dealIds.length; i += batchSize) {
      const batchIds = dealIds.slice(i, i + batchSize);
      
      try {
        // Use batch read endpoint
        const batchRes = await fetch(
          'https://api.hubapi.com/crm/v3/objects/deals/batch/read',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${hubspotToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              properties: ['dealstage', 'dealname'],
              inputs: batchIds.map(id => ({ id })),
            }),
          }
        );

        if (!batchRes.ok) {
          const errorText = await batchRes.text();
          syncResults.errors.push(`Batch ${i / batchSize + 1}: ${errorText}`);
          syncResults.failed += batchIds.length;
          continue;
        }

        const batchData = await batchRes.json();
        
        // Update each booking with its deal stage
        for (const deal of batchData.results || []) {
          const dealId = deal.id;
          const stageId = deal.properties?.dealstage;
          const stageName = stageMap[stageId] || stageId || 'Unknown';

          // Find the booking with this deal ID and update it
          await db
            .update(schema.bookings)
            .set({
              hubspotDealStage: stageName,
              hubspotDealStageSyncedAt: now,
            })
            .where(eq(schema.bookings.hubspotDealId, dealId));

          syncResults.synced++;
        }
      } catch (err) {
        console.error('Batch sync error:', err);
        syncResults.errors.push(`Batch ${i / batchSize + 1}: ${err}`);
        syncResults.failed += batchIds.length;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${syncResults.synced} of ${syncResults.total} deals`,
      ...syncResults,
    });

  } catch (error) {
    console.error('HubSpot sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync HubSpot deals' },
      { status: 500 }
    );
  }
}
