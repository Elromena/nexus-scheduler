-- Migration: Add excluded_from_analytics flag to bookings
-- Created: 2026-01-21

-- Allows hiding internal/team bookings from analytics without deleting them
ALTER TABLE bookings ADD COLUMN excluded_from_analytics INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_bookings_excluded_from_analytics ON bookings(excluded_from_analytics);

