-- Migration: Initial Schema
-- Created: 2026-01-15

-- =============================================
-- VISITORS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS visitors (
    id TEXT PRIMARY KEY,
    fingerprint TEXT NOT NULL,
    
    -- Attribution
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    landing_page TEXT,
    
    -- Device Info
    user_agent TEXT,
    device_type TEXT,
    browser TEXT,
    browser_version TEXT,
    os TEXT,
    os_version TEXT,
    screen_resolution TEXT,
    
    -- Location
    ip_address TEXT,
    country TEXT,
    country_code TEXT,
    city TEXT,
    region TEXT,
    timezone TEXT,
    
    -- Timestamps
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    
    -- Session tracking
    total_visits INTEGER DEFAULT 1,
    total_page_views INTEGER DEFAULT 0,
    total_time_on_site INTEGER DEFAULT 0,
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visitors_fingerprint ON visitors(fingerprint);

-- =============================================
-- SESSIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    visitor_id TEXT NOT NULL,
    
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration INTEGER,
    page_count INTEGER DEFAULT 0,
    
    entry_page TEXT,
    exit_page TEXT,
    referrer TEXT,
    
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    
    FOREIGN KEY (visitor_id) REFERENCES visitors(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_visitor ON sessions(visitor_id);

-- =============================================
-- PAGE VIEWS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS page_views (
    id TEXT PRIMARY KEY,
    visitor_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    
    page_url TEXT NOT NULL,
    page_title TEXT,
    
    timestamp TEXT NOT NULL,
    time_on_page INTEGER,
    scroll_depth INTEGER,
    
    FOREIGN KEY (visitor_id) REFERENCES visitors(id),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON page_views(visitor_id);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_id);

-- =============================================
-- FORM EVENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS form_events (
    id TEXT PRIMARY KEY,
    visitor_id TEXT NOT NULL,
    session_id TEXT,
    
    event_type TEXT NOT NULL,
    step INTEGER,
    
    timestamp TEXT NOT NULL,
    metadata TEXT,
    
    FOREIGN KEY (visitor_id) REFERENCES visitors(id)
);

CREATE INDEX IF NOT EXISTS idx_form_events_visitor ON form_events(visitor_id);

-- =============================================
-- BOOKINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    visitor_id TEXT,
    
    -- Contact Info
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    website TEXT NOT NULL,
    industry TEXT,
    heard_from TEXT,
    
    -- Qualification
    objective TEXT,
    budget TEXT,
    role_type TEXT,
    
    -- Scheduling
    scheduled_date TEXT,
    scheduled_time TEXT,
    timezone TEXT,
    
    -- Integration IDs
    hubspot_contact_id TEXT,
    hubspot_deal_id TEXT,
    google_event_id TEXT,
    google_meet_link TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending',
    
    -- Attribution snapshot
    attribution_source TEXT,
    attribution_medium TEXT,
    attribution_campaign TEXT,
    attribution_landing_page TEXT,
    attribution_referrer TEXT,
    
    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT,
    
    FOREIGN KEY (visitor_id) REFERENCES visitors(id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(email);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(created_at);

-- =============================================
-- SETTINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('test_mode', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('calendar_slots', '["09:00","09:30","10:00","10:30","11:00","11:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00"]');
