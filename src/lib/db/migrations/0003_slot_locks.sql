-- Migration: Add slot locks table (prevent double booking)
-- Created: 2026-01-21

-- =============================================
-- SLOT LOCKS TABLE
-- Unique per (scheduled_date, scheduled_time)
-- =============================================
CREATE TABLE IF NOT EXISTS slot_locks (
    id TEXT PRIMARY KEY, -- bookingId
    scheduled_date TEXT NOT NULL,
    scheduled_time TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Enforce unique booking slot
CREATE UNIQUE INDEX IF NOT EXISTS uidx_slot_locks_date_time ON slot_locks(scheduled_date, scheduled_time);

