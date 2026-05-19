-- Add PDF visibility toggle for public event page
ALTER TABLE "events"
ADD COLUMN IF NOT EXISTS "showPdfAttachment" BOOLEAN NOT NULL DEFAULT true;
