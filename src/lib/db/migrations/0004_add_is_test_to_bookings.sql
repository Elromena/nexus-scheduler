-- Migration: Add is_test flag to bookings
-- Created: 2026-01-21

-- Add a flag so we can separate test-mode bookings from real bookings
ALTER TABLE bookings ADD COLUMN is_test INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_bookings_is_test ON bookings(is_test);

