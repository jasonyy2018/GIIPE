-- Add submitUrl field to Event model
-- This migration adds a new optional field for submission URL

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "submitUrl" TEXT;

