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

interface Session {
  id: string;
  startedAt: string;
  endedAt: string | null;
  duration: number | null;
  pageCount: number;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

interface LeadDetails {
  booking: Record<string, unknown>;
  visitor: {
    id: string;
    totalVisits: number;
    deviceType: string | null;
    browser: string | null;
    os: string | null;
    country: string | null;
    city: string | null;
    timezone: string | null;
    firstSeenAt: string;
    lastSeenAt: string;
    totalTimeOnSite: number;
  } | null;
  sessions: Array<Session>;
  pageViews: Array<PageView>;
  formEvents: Array<FormEvent>;
}

interface TimelineItem {
  id: string;
  type: 'page_view' | 'form_event' | 'session_header';
  timestamp: string;
  label: string;
  step?: number;
  metadata?: Record<string, unknown> | null;
  sessionData?: Session;
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
        {[10, 20, 50, 100].map((size) => (
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

  // Pagination state for timeline
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Expanded metadata rows
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
    if (typeof value !== 'number' || value <= 0) return '—';
    
    const days = Math.floor(value / 86400);
    const hours = Math.floor((value % 86400) / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const seconds = value % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    
    return parts.join(' ');
  };

  // Merge Page Views, Form Events, and Sessions into a single Timeline
  const timeline = useMemo(() => {
    if (!data) return [];

    const pageViews: TimelineItem[] = (data.pageViews || []).map(pv => ({
      id: pv.id,
      type: 'page_view',
      timestamp: pv.timestamp,
      label: pv.pageUrl.replace(/^https?:\/\/[^/]+/, '') || '/',
    }));

    const formEvents: TimelineItem[] = (data.formEvents || []).map(fe => {
      let metadata: Record<string, unknown> | null = null;
      if (typeof fe.metadata === 'string') {
        try {
          metadata = JSON.parse(fe.metadata);
        } catch {
          metadata = null;
        }
      } else {
        metadata = fe.metadata as Record<string, unknown> | null;
      }

      return {
        id: fe.id,
        type: 'form_event',
        timestamp: fe.timestamp,
        label: fe.eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        step: fe.step,
        metadata: metadata,
      };
    });

    const sessionHeaders: TimelineItem[] = (data.sessions || []).map((s, idx) => ({
      id: s.id,
      type: 'session_header',
      timestamp: s.startedAt,
      label: `Session #${data.sessions.length - idx}`,
      sessionData: s,
    }));

    return [...pageViews, ...formEvents, ...sessionHeaders].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [data]);

  // Paginated timeline items
  const paginatedTimeline = useMemo(() => {
    const start = (page - 1) * pageSize;
    return timeline.slice(start, start + pageSize);
  }, [timeline, page, pageSize]);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
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
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Visitor Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-slate-500">Total Visits</div>
            <div className="font-bold text-primary-600 text-lg">{visitor?.totalVisits || 1}</div>
          </div>
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
            <div className="text-slate-500">Total Time on Site</div>
            <div className="font-medium text-slate-900">{formatSeconds(visitor?.totalTimeOnSite)}</div>
          </div>
        </div>
      </div>

      {/* Unified User Activity Timeline */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">User Activity Timeline</h2>
          <div className="flex gap-2">
            <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
              {data.sessions.length} Visits
            </span>
            <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
              {timeline.filter(t => t.type !== 'session_header').length} Events
            </span>
          </div>
        </div>

        <div className="p-6">
          {timeline.length > 0 ? (
            <>
              <PaginationControls
                totalItems={timeline.length}
                currentPage={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={handlePageSizeChange}
              />

              <div className="relative mt-4">
                {/* Vertical line connecting icons */}
                <div className="absolute left-[1.35rem] top-2 bottom-4 w-0.5 bg-slate-100"></div>

                <div className="space-y-4">
                  {paginatedTimeline.map((item) => {
                    if (item.type === 'session_header') {
                      return (
                        <div key={item.id} className="relative py-2 first:pt-0">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-full bg-slate-900 flex items-center justify-center z-10 shadow-md">
                              <span className="text-lg" title="New Session">🚀</span>
                            </div>
                            <div className="flex-1 border-b border-slate-200 pb-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-900">{item.label} Started</span>
                                <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                  {formatDateTime(item.timestamp)}
                                </span>
                              </div>
                              {item.sessionData?.utmSource && (
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Source: {item.sessionData.utmSource} | Medium: {item.sessionData.utmMedium || 'none'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const isExpanded = expandedEventIds.has(item.id);
                    const showRaw = showRawJson.has(item.id);
                    const metadataEntries = item.metadata ? Object.entries(item.metadata) : [];
                    const isFormEvent = item.type === 'form_event';

                    return (
                      <div key={item.id} className="relative pl-12 group">
                        {/* Icon Container */}
                        <div className="absolute left-0 top-0 w-11 h-11 rounded-full bg-white border-2 border-slate-50 flex items-center justify-center z-10 shadow-sm group-hover:border-primary-100 transition-colors">
                          {item.type === 'page_view' ? (
                            <span className="text-lg" title="Page View">📄</span>
                          ) : (
                            <span className="text-lg" title="Form Interaction">📝</span>
                          )}
                        </div>

                        <div className={`rounded-lg border transition-all ${isExpanded ? 'border-primary-200 bg-primary-50/10' : 'border-slate-100 hover:border-slate-200 bg-white shadow-sm hover:shadow'}`}>
                          <div
                            className={`p-3 ${isFormEvent ? 'cursor-pointer' : ''}`}
                            onClick={() => isFormEvent && toggleEventExpanded(item.id)}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
                                  <span className="truncate">{item.label}</span>
                                  {item.step !== undefined && item.step !== null && (
                                    <span className="text-[10px] uppercase font-bold tracking-wider bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded flex-shrink-0">
                                      Step {item.step}
                                    </span>
                                  )}
                                  {item.type === 'form_event' && (
                                    <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded flex-shrink-0">
                                      Form
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {formatDateTime(item.timestamp)}
                                </div>
                              </div>

                              {isFormEvent && (
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {metadataEntries.length > 0 && (
                                    <span className="text-[11px] text-slate-400 font-medium">
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
                              )}
                            </div>
                          </div>

                          {isExpanded && isFormEvent && metadataEntries.length > 0 && (
                            <div className="border-t border-slate-100 bg-white p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                              {!showRaw ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                  {metadataEntries.map(([key, value]) => (
                                    <div key={key} className="flex flex-col py-1 border-b border-slate-50 last:border-0">
                                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">{key}</span>
                                      <span className="text-sm text-slate-900 break-all">{formatMetadataValue(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="relative">
                                  <pre className="text-xs bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                                    {JSON.stringify(item.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                              <div className="mt-3 pt-3 border-t border-slate-50 flex justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleRawJson(item.id);
                                  }}
                                  className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
                                >
                                  {showRaw ? (
                                    <>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                                      Show formatted
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                                      View raw JSON
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <span className="text-4xl">🕰️</span>
              <p className="mt-2 text-sm text-slate-500">No activity recorded for this visitor yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
