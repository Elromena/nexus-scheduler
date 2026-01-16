'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  children?: NavItem[];
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const pathname = usePathname();

  // Auto-expand reports if we're on a reports page
  useEffect(() => {
    if (pathname?.startsWith('/admin/reports')) {
      setReportsExpanded(true);
    }
  }, [pathname]);

  useEffect(() => {
    // Check if already authenticated
    const token = localStorage.getItem('admin_token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Store password as token (simple auth)
    localStorage.setItem('admin_token', password);
    setIsAuthenticated(true);
    setError('');
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Admin Login</h1>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="mb-4 text-red-600 text-sm">{error}</div>
            )}
            <button type="submit" className="btn-primary">
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  const navItems: NavItem[] = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/leads', label: 'Leads', icon: '👥' },
    { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
    { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
  ];

  const reportSubItems: NavItem[] = [
    { href: '/admin/reports', label: 'Overview', icon: '📋' },
    { href: '/admin/reports/referrers', label: 'Referrers', icon: '🔗' },
    { href: '/admin/reports/landing-pages', label: 'Landing Pages', icon: '📄' },
    { href: '/admin/reports/industries', label: 'Industries', icon: '🏢' },
    { href: '/admin/reports/locations', label: 'Locations', icon: '🌍' },
    { href: '/admin/reports/deal-stages', label: 'Deal Stages', icon: '💼' },
  ];

  const isOnReportsPage = pathname?.startsWith('/admin/reports');

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-slate-900">Nexus Admin</h1>
        </div>
        
        <nav className="space-y-1">
          {navItems.slice(0, 3).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === item.href
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}

          {/* Reports with sub-items */}
          <div>
            <button
              onClick={() => setReportsExpanded(!reportsExpanded)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                isOnReportsPage
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span>📑</span>
                <span>Reports</span>
              </div>
              <svg
                className={`w-4 h-4 transition-transform ${reportsExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {reportsExpanded && (
              <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-100 pl-4">
                {reportSubItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      pathname === item.href
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                  >
                    <span className="text-xs">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          <Link
            href="/admin/settings"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === '/admin/settings'
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>⚙️</span>
            <span>Settings</span>
          </Link>
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
