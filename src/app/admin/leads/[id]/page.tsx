'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface LeadDetails {
  booking: Record<string, unknown>;
  visitor: Record<string, unknown> | null;
  sessions: Array<Record<string, unknown>>;
  pageViews: Array<Record<string, unknown>>;
  formEvents: Array<Record<string, unknown>>;
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const leadId = params?.id;
  const [data, setData] = useState<LeadDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const booking = data?.booking || {};
  const visitor = data?.visitor || null;

  const formatDateTime = (value: unknown) => {
    if (!value || typeof value !== 'string') return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const formatSeconds = (value: unknown) => {
    if (typeof value !== 'number') return '—';
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const formEvents = useMemo(() => {
    if (!data?.formEvents) return [];
    return data.formEvents.map((event) => {
      const metadataRaw = event.metadata;
      let metadata: Record<string, unknown> | null = null;
      if (typeof metadataRaw === 'string') {
        try {
          metadata = JSON.parse(metadataRaw);
        } catch {
          metadata = null;
        }
      }
      return { ...event, metadata };
    });
  }, [data?.formEvents]);

  useEffect(() => {
    if (!leadId) return;
    const fetchLead = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch(`/scheduler/api/leads/${leadId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('admin_token');
            window.location.reload();
            return;
          }
          throw new Error('Failed to fetch lead details');
        }

        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load lead');
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [leadId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner border-primary-600 border-t-transparent w-8 h-8"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error || 'Lead not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {String(booking.firstName || '')} {String(booking.lastName || '')}
          </h1>
          <p className="text-sm text-slate-500">
            Booking ID: {String(booking.id || '')}
          </p>
        </div>
        <Link href="/admin/leads" className="btn-outline">
          Back to leads
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Booking Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-500">Email</div>
              <div className="font-medium text-slate-900">{String(booking.email || '—')}</div>
            </div>
            <div>
              <div className="text-slate-500">Website</div>
              <div className="font-medium text-slate-900">{String(booking.website || '—')}</div>
            </div>
            <div>
              <div className="text-slate-500">Industry</div>
              <div className="font-medium text-slate-900">{String(booking.industry || '—')}</div>
            </div>
            <div>
              <div className="text-slate-500">Heard From</div>
              <div className="font-medium text-slate-900">{String(booking.heardFrom || '—')}</div>
            </div>
            <div>
              <div className="text-slate-500">Objective</div>
              <div className="font-medium text-slate-900">{String(booking.objective || '—')}</div>
            </div>
            <div>
              <div className="text-slate-500">Budget</div>
              <div className="font-medium text-slate-900">{String(booking.budget || '—')}</div>
            </div>
            <div>
              <div className="text-slate-500">Role</div>
              <div className="font-medium text-slate-900">{String(booking.roleType || '—')}</div>
            </div>
            <div>
              <div className="text-slate-500">Status</div>
              <div className="font-medium text-slate-900">{String(booking.status || '—')}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Schedule</h2>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-slate-500">Date</div>
              <div className="font-medium text-slate-900">{String(booking.scheduledDate || '—')}</div>
            </div>
            <div>
              <div className="text-slate-500">Time</div>
              <div className="font-medium text-slate-900">{String(booking.scheduledTime || '—')}</div>
            </div>
            <div>
              <div className="text-slate-500">Timezone</div>
              <div className="font-medium text-slate-900">{String(booking.timezone || '—')}</div>
            </div>
            <div>
              <div className="text-slate-500">Created</div>
              <div className="font-medium text-slate-900">{formatDateTime(booking.createdAt)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Attribution</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-500">Source</div>
              <div className="font-medium text-slate-900">{String(booking.attributionSource || '—')}</div>
            </div>
            <div>
              <div className="text-slate-500">Medium</div>
              <div className="font-medium text-slate-900">{String(booking.attributionMedium || '—')}</div>
            </div>
            <div>
              <div className="text-slate-500">Campaign</div>
              <div className="font-medium text-slate-900">{String(booking.attributionCampaign || '—')}</div>
            </div>
            <div>
              <div className="text-slate-500">Landing Page</div>
              <div className="font-medium text-slate-900">{String(booking.attributionLandingPage || '—')}</div>
            </div>
            <div>
              <div className="text-slate-500">Referrer</div>
              <div className="font-medium text-slate-900 break-all">{String(booking.attributionReferrer || '—')}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Integrations</h2>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-slate-500">HubSpot Contact ID</div>
              <div className="font-medium text-slate-900">{String(booking.hubspotContactId || '—')}</div>
            </div>
            <div>
              <div className="text-slate-500">HubSpot Deal ID</div>
              <div className="font-medium text-slate-900">{String(booking.hubspotDealId || '—')}</div>
            </div>
            <div>
              <div className="text-slate-500">Google Event ID</div>
              <div className="font-medium text-slate-900">{String(booking.googleEventId || '—')}</div>
            </div>
            <div>
              <div className="text-slate-500">Google Meet</div>
              <div className="font-medium text-slate-900 break-all">{String(booking.googleMeetLink || '—')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Visitor</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-slate-500">Device</div>
            <div className="font-medium text-slate-900">{String(visitor?.deviceType || '—')}</div>
          </div>
          <div>
            <div className="text-slate-500">Browser</div>
            <div className="font-medium text-slate-900">{String(visitor?.browser || '—')}</div>
          </div>
          <div>
            <div className="text-slate-500">OS</div>
            <div className="font-medium text-slate-900">{String(visitor?.os || '—')}</div>
          </div>
          <div>
            <div className="text-slate-500">Country</div>
            <div className="font-medium text-slate-900">{String(visitor?.country || '—')}</div>
          </div>
          <div>
            <div className="text-slate-500">City</div>
            <div className="font-medium text-slate-900">{String(visitor?.city || '—')}</div>
          </div>
          <div>
            <div className="text-slate-500">Timezone</div>
            <div className="font-medium text-slate-900">{String(visitor?.timezone || '—')}</div>
          </div>
          <div>
            <div className="text-slate-500">First Seen</div>
            <div className="font-medium text-slate-900">{formatDateTime(visitor?.firstSeenAt)}</div>
          </div>
          <div>
            <div className="text-slate-500">Last Seen</div>
            <div className="font-medium text-slate-900">{formatDateTime(visitor?.lastSeenAt)}</div>
          </div>
          <div>
            <div className="text-slate-500">Time on Site</div>
            <div className="font-medium text-slate-900">{formatSeconds(visitor?.totalTimeOnSite)}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Form Events</h2>
        <div className="space-y-3">
          {formEvents.map((event) => (
            <div key={String(event.id)} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-slate-100 rounded-lg p-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {String(event.eventType)} {event.step ? `(Step ${event.step})` : ''}
                </div>
                <div className="text-xs text-slate-500">{formatDateTime(event.timestamp)}</div>
              </div>
              <div className="text-xs text-slate-600 break-all">
                {event.metadata ? JSON.stringify(event.metadata) : String(event.metadata || '')}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Page Views</h2>
        <div className="space-y-2">
          {data.pageViews.map((view) => (
            <div key={String(view.id)} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border border-slate-100 rounded-lg p-3 text-sm">
              <div className="font-medium text-slate-900 break-all">{String(view.pageUrl || '—')}</div>
              <div className="text-xs text-slate-500">{formatDateTime(view.timestamp)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
