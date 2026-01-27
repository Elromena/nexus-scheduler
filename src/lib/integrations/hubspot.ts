/**
 * HubSpot API v3 Integration
 */

export interface HubSpotContactProperties {
  email: string;
  firstname?: string;
  lastname?: string;
  website?: string;
  // Custom properties (must exist in your HubSpot account)
  what_niche_is_the_brand_in___cloned_?: string;
  where_did_you_first_hear_about_us_main?: string;
  what_is_the_goal_for_your_company_brand_main?: string;
  advertising_budget_main?: string;
  lead_type?: string;
  lifecyclestage?: string;
}

export interface HubSpotDealProperties {
  dealname: string;
  pipeline?: string;
  dealstage?: string;
  amount?: number;
  closedate?: string;
}

export interface HubSpotMeetingProperties {
  hs_timestamp: string;
  hs_meeting_title: string;
  hs_meeting_body?: string;
  hs_meeting_start_time: string;
  hs_meeting_end_time: string;
  hs_meeting_outcome?: string;
  hs_meeting_external_url?: string; // Google Meet link
  hs_meeting_location?: string;
}

interface HubSpotResponse {
  id?: string;
  properties?: Record<string, string>;
  results?: Array<{ id: string; properties: Record<string, string> }>;
  status?: string;
  message?: string;
}

export class HubSpotClient {
  private token: string;
  private baseUrl = 'https://api.hubapi.com/crm/v3';

  constructor(token: string) {
    this.token = token;
  }

  private async request(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<HubSpotResponse> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('HubSpot API error:', data);
      throw new Error(data.message || 'HubSpot API error');
    }

    return data;
  }

  /**
   * Search for a contact by email
   */
  async searchContact(email: string): Promise<string | null> {
    try {
      const response = await this.request('/objects/contacts/search', 'POST', {
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: email
          }]
        }]
      });

      if (response.results && response.results.length > 0) {
        return response.results[0].id;
      }
      return null;
    } catch (error) {
      console.error('HubSpot search error:', error);
      return null;
    }
  }

  /**
   * Create a new contact
   */
  async createContact(properties: HubSpotContactProperties): Promise<string | null> {
    try {
      const response = await this.request('/objects/contacts', 'POST', {
        properties
      });
      return response.id || null;
    } catch (error) {
      console.error('HubSpot create contact error:', error);
      throw error;
    }
  }

  /**
   * Update an existing contact
   */
  async updateContact(contactId: string, properties: Partial<HubSpotContactProperties>): Promise<boolean> {
    try {
      await this.request(`/objects/contacts/${contactId}`, 'PATCH', {
        properties
      });
      return true;
    } catch (error) {
      console.error('HubSpot update contact error:', error);
      return false;
    }
  }

  /**
   * Create or update a contact (upsert)
   */
  async upsertContact(email: string, properties: HubSpotContactProperties): Promise<string | null> {
    const existingId = await this.searchContact(email);
    
    if (existingId) {
      await this.updateContact(existingId, properties);
      return existingId;
    } else {
      return this.createContact(properties);
    }
  }

  /**
   * Create a deal and associate with a contact
   */
  async createDeal(contactId: string, properties: HubSpotDealProperties): Promise<string | null> {
    try {
      const response = await this.request('/objects/deals', 'POST', {
        properties,
        associations: [{
          to: { id: contactId },
          types: [{
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: 3 // Contact to Deal association
          }]
        }]
      });
      return response.id || null;
    } catch (error) {
      console.error('HubSpot create deal error:', error);
      return null;
    }
  }

  /**
   * Create a meeting engagement and associate with a contact
   */
  async createMeeting(contactId: string, properties: HubSpotMeetingProperties): Promise<string | null> {
    try {
      const response = await this.request('/objects/meetings', 'POST', {
        properties,
        associations: [{
          to: { id: contactId },
          types: [{
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: 194 // Contact to Meeting association
          }]
        }]
      });
      return response.id || null;
    } catch (error) {
      console.error('HubSpot create meeting error:', error);
      return null;
    }
  }

  /**
   * Update contact lifecycle stage
   */
  async updateLifecycleStage(contactId: string, stage: string): Promise<boolean> {
    return this.updateContact(contactId, { lifecyclestage: stage });
  }

  /**
   * Full booking flow: update contact, create deal, create meeting
   */
  async processBooking(
    contactId: string,
    contactData: {
      firstName: string;
      lastName: string;
      website: string;
      objective: string;
      budget: string;
      roleType: string;
      industry?: string;
    },
    meetingData: {
      startTime: string;
      endTime: string;
      meetLink?: string;
    }
  ): Promise<{ dealId: string | null; meetingId: string | null }> {
    // Update contact to opportunity stage
    await this.updateContact(contactId, {
      what_is_the_goal_for_your_company_brand_main: contactData.objective,
      advertising_budget_main: contactData.budget,
      lead_type: contactData.roleType,
      lifecyclestage: 'opportunity'
    });

    // Create deal
    const dealId = await this.createDeal(contactId, {
      dealname: `${contactData.website} - Access Request`,
      pipeline: 'default',
      dealstage: 'qualifiedtobuy',
      amount: 0,
      closedate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

    // Build meeting description
    const meetingBody = `Blockchain-Ads Account Verification Call

Lead Details:
• Name: ${contactData.firstName} ${contactData.lastName}
• Website: ${contactData.website}
• Industry: ${contactData.industry || 'N/A'}
• Budget: ${contactData.budget}
• Objective: ${contactData.objective}

${meetingData.meetLink ? `Join Meeting: ${meetingData.meetLink}` : ''}`;

    // Create meeting with Google Meet link
    const meetingId = await this.createMeeting(contactId, {
      hs_timestamp: meetingData.startTime, // Must match hs_meeting_start_time per HubSpot docs
      hs_meeting_title: 'Blockchain-Ads Account Verification',
      hs_meeting_body: meetingBody,
      hs_meeting_start_time: meetingData.startTime,
      hs_meeting_end_time: meetingData.endTime,
      hs_meeting_outcome: 'SCHEDULED',
      hs_meeting_external_url: meetingData.meetLink || undefined,
      hs_meeting_location: meetingData.meetLink ? 'Google Meet' : undefined,
    });

    return { dealId, meetingId };
  }
}

/**
 * Get HubSpot client instance
 */
export function getHubSpotClient(token: string): HubSpotClient {
  return new HubSpotClient(token);
}
