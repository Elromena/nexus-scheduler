'use client';

import { useEffect, useState } from 'react';
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
          <h1 className="text-2xl font-bold text-slate-900">Lead Details</h1>
          <p className="text-sm text-slate-500">
            Booking ID: {String(data.booking.id || '')}
          </p>
        </div>
        <Link href="/admin/leads" className="btn-outline">
          Back to leads
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Booking</h2>
        <pre className="text-xs bg-slate-50 p-4 rounded-lg overflow-auto">
{JSON.stringify(data.booking, null, 2)}
        </pre>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Visitor</h2>
        <pre className="text-xs bg-slate-50 p-4 rounded-lg overflow-auto">
{JSON.stringify(data.visitor, null, 2)}
        </pre>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Form Events</h2>
        <pre className="text-xs bg-slate-50 p-4 rounded-lg overflow-auto">
{JSON.stringify(data.formEvents, null, 2)}
        </pre>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Page Views</h2>
        <pre className="text-xs bg-slate-50 p-4 rounded-lg overflow-auto">
{JSON.stringify(data.pageViews, null, 2)}
        </pre>
      </div>
    </div>
  );
}
