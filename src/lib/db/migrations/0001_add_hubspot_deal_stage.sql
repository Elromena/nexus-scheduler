-- Migration: Add HubSpot Deal Stage
-- Created: 2026-01-15

-- Add hubspot_deal_stage column to bookings
ALTER TABLE bookings ADD COLUMN hubspot_deal_stage TEXT;

-- Add hubspot_deal_stage_synced_at column to bookings
ALTER TABLE bookings ADD COLUMN hubspot_deal_stage_synced_at TEXT;
