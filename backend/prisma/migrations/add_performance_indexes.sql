-- Add performance indexes for better query optimization

-- Events table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "events_status_start_date_idx" ON "events" ("status", "startDate");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "events_tags_idx" ON "events" USING GIN ("tags");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "events_created_at_idx" ON "events" ("createdAt");

-- Comments table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "comments_target_status_idx" ON "comments" ("targetType", "targetId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "comments_created_at_idx" ON "comments" ("createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "comments_parent_id_idx" ON "comments" ("parentId");

-- Registrations table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "registrations_event_status_idx" ON "registrations" ("eventId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "registrations_user_status_idx" ON "registrations" ("userId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "registrations_registered_at_idx" ON "registrations" ("registeredAt");

-- Submissions table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "submissions_event_status_idx" ON "submissions" ("eventId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "submissions_user_status_idx" ON "submissions" ("userId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "submissions_created_at_idx" ON "submissions" ("createdAt");

-- News table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "news_status_published_at_idx" ON "news" ("status", "publishedAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "news_tags_idx" ON "news" USING GIN ("tags");

-- Notifications table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "notifications_status_created_at_idx" ON "notifications" ("status", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "notifications_user_status_idx" ON "notifications" ("userId", "status");

-- Sensitive words table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "sensitive_words_active_level_idx" ON "sensitive_words" ("isActive", "level");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "sensitive_words_category_idx" ON "sensitive_words" ("category");

-- Audit logs table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "audit_logs_user_action_idx" ON "audit_logs" ("userId", "action");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "audit_logs_resource_idx" ON "audit_logs" ("resource", "resourceId");

-- Users table additional indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_active_role_idx" ON "users" ("isActive", "role");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_created_at_idx" ON "users" ("createdAt");

-- Comment reports table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "comment_reports_created_at_idx" ON "comment_reports" ("createdAt");

-- System settings table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "system_settings_key_idx" ON "system_settings" ("key");