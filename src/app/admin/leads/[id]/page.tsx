'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface FormEvent {
  id: string;
  eventType: string;
  step?: number;
  timestamp: string;
  metadata: string | Record<string, unknown> | null;
}

interface PageView {
  id: string;
  pageUrl: string;
  timestamp: string;
}

interface LeadDetails {
  booking: Record<string, unknown>;
  visitor: Record<string, unknown> | null;
  sessions: Array<Record<string, unknown>>;
  pageViews: Array<PageView>;
  formEvents: Array<FormEvent>;
}

// Reusable pagination component
function PaginationControls({
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const totalPages = Math.ceil(totalItems / pageSize);
  
  return (
    <div className="flex items-center justify-between mb-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-slate-500">Show:</span>
        {[10, 20, 50].map((size) => (
          <button
            key={size}
            onClick={() => onPageSizeChange(size)}
            className={`px-2 py-1 rounded ${
              pageSize === size
                ? 'bg-primary-100 text-primary-700 font-medium'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {size}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-slate-600">
          Page {currentPage} of {totalPages || 1}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const leadId = params?.id;
  const [data, setData] = useState<LeadDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const booking = data?.booking || {};
  const visitor = data?.visitor || null;

  // Collapsible state
  const [pageViewsExpanded, setPageViewsExpanded] = useState(false);
  const [formEventsExpanded, setFormEventsExpanded] = useState(false);

  // Pagination state for page views
  const [pvPage, setPvPage] = useState(1);
  const [pvPageSize, setPvPageSize] = useState(10);

  // Pagination state for form events
  const [fePage, setFePage] = useState(1);
  const [fePageSize, setFePageSize] = useState(10);

  // Expanded metadata rows (for form events)
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set());
  const [showRawJson, setShowRawJson] = useState<Set<string>>(new Set());

  const toggleEventExpanded = (id: string) => {
    setExpandedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleRawJson = (id: string) => {
    setShowRawJson((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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

  const processedFormEvents = useMemo(() => {
    if (!data?.formEvents) return [];
    return data.formEvents.map((event) => {
      const metadataRaw = event.metadata;
      let parsedMetadata: Record<string, unknown> | null = null;
      if (typeof metadataRaw === 'string') {
        try {
          parsedMetadata = JSON.parse(metadataRaw);
        } catch {
          parsedMetadata = null;
        }
      } else if (typeof metadataRaw === 'object') {
        parsedMetadata = metadataRaw as Record<string, unknown> | null;
      }
      return {
        id: event.id,
        eventType: event.eventType,
        step: event.step,
        timestamp: event.timestamp,
        metadata: parsedMetadata,
      };
    });
  }, [data?.formEvents]);

  // Sorted page views (most recent first)
  const sortedPageViews = useMemo(() => {
    if (!data?.pageViews) return [];
    return [...data.pageViews].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [data?.pageViews]);

  // Sorted form events (most recent first)
  const sortedFormEvents = useMemo(() => {
    return [...processedFormEvents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [processedFormEvents]);

  // Paginated page views
  const paginatedPageViews = useMemo(() => {
    const start = (pvPage - 1) * pvPageSize;
    return sortedPageViews.slice(start, start + pvPageSize);
  }, [sortedPageViews, pvPage, pvPageSize]);

  // Paginated form events
  const paginatedFormEvents = useMemo(() => {
    const start = (fePage - 1) * fePageSize;
    return sortedFormEvents.slice(start, start + fePageSize);
  }, [sortedFormEvents, fePage, fePageSize]);

  // Reset to page 1 when page size changes
  const handlePvPageSizeChange = (size: number) => {
    setPvPageSize(size);
    setPvPage(1);
  };

  const handleFePageSizeChange = (size: number) => {
    setFePageSize(size);
    setFePage(1);
  };

  // Format metadata for display
  const formatMetadataValue = (value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

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

      {/* Form Events - Collapsible */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <button
          onClick={() => setFormEventsExpanded(!formEventsExpanded)}
          className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            Form Events ({sortedFormEvents.length})
          </h2>
          <svg
            className={`w-5 h-5 text-slate-500 transition-transform ${formEventsExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {formEventsExpanded && (
          <div className="px-6 pb-6 border-t border-slate-100">
            <div className="pt-4">
              {sortedFormEvents.length > 0 ? (
                <>
                  <PaginationControls
                    totalItems={sortedFormEvents.length}
                    currentPage={fePage}
                    pageSize={fePageSize}
                    onPageChange={setFePage}
                    onPageSizeChange={handleFePageSizeChange}
                  />
                  <div className="space-y-2">
                    {paginatedFormEvents.map((event) => {
                      const isExpanded = expandedEventIds.has(event.id);
                      const showRaw = showRawJson.has(event.id);
                      const metadataEntries = event.metadata ? Object.entries(event.metadata) : [];

                      return (
                        <div key={event.id} className="border border-slate-100 rounded-lg overflow-hidden">
                          <div
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50"
                            onClick={() => toggleEventExpanded(event.id)}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-lg">📝</span>
                              <div>
                                <div className="text-sm font-medium text-slate-900">
                                  {event.eventType}
                                  {event.step !== undefined && event.step !== null && (
                                    <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                      Step {event.step}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500">{formatDateTime(event.timestamp)}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {metadataEntries.length > 0 && (
                                <span className="text-xs text-slate-400">
                                  {metadataEntries.length} field{metadataEntries.length !== 1 ? 's' : ''}
                                </span>
                              )}
                              <svg
                                className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>

                          {isExpanded && metadataEntries.length > 0 && (
                            <div className="border-t border-slate-100 bg-slate-50 p-3">
                              {!showRaw ? (
                                <div className="space-y-2">
                                  {metadataEntries.map(([key, value]) => (
                                    <div key={key} className="flex text-sm">
                                      <span className="text-slate-500 w-32 flex-shrink-0">{key}:</span>
                                      <span className="text-slate-900 break-all">{formatMetadataValue(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <pre className="text-xs bg-slate-900 text-green-400 p-3 rounded overflow-x-auto">
                                  {JSON.stringify(event.metadata, null, 2)}
                                </pre>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRawJson(event.id);
                                }}
                                className="mt-2 text-xs text-primary-600 hover:text-primary-700"
                              >
                                {showRaw ? 'Show formatted' : 'View raw JSON'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-slate-500 text-sm">No form events recorded</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Page Views - Collapsible */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <button
          onClick={() => setPageViewsExpanded(!pageViewsExpanded)}
          className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            Page Views ({sortedPageViews.length})
          </h2>
          <svg
            className={`w-5 h-5 text-slate-500 transition-transform ${pageViewsExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {pageViewsExpanded && (
          <div className="px-6 pb-6 border-t border-slate-100">
            <div className="pt-4">
              {sortedPageViews.length > 0 ? (
                <>
                  <PaginationControls
                    totalItems={sortedPageViews.length}
                    currentPage={pvPage}
                    pageSize={pvPageSize}
                    onPageChange={setPvPage}
                    onPageSizeChange={handlePvPageSizeChange}
                  />
                  <div className="space-y-2">
                    {paginatedPageViews.map((view) => (
                      <div
                        key={view.id}
                        className="flex items-center justify-between p-3 border border-slate-100 rounded-lg text-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-lg flex-shrink-0">📄</span>
                          <span className="font-medium text-slate-900 truncate">
                            {view.pageUrl?.replace(/^https?:\/\/[^/]+/, '') || '—'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex-shrink-0 ml-4">
                          {formatDateTime(view.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-slate-500 text-sm">No page views recorded</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
