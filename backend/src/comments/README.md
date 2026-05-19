# Comment Moderation System

This module implements a comprehensive comment moderation workflow for the Conference Management Platform.

## Features Implemented

### 1. Comment Reporting System
- Users can report inappropriate comments with specific reasons (spam, harassment, hate speech, etc.)
- Prevents duplicate reports from the same user
- Automatically flags comments for review when first report is submitted

### 2. Admin Moderation Queue
- Dedicated endpoint for admins to view comments requiring moderation
- Supports filtering by status, target type, and search
- Includes pagination and sorting capabilities
- Shows comment reports and reporter information

### 3. Comment Approval/Rejection System
- Admins can approve, reject, or flag comments
- Moderation notes can be added for tracking decisions
- Tracks who moderated the comment and when
- Maintains audit trail of moderation actions

## API Endpoints

### Report Comment
```
POST /comments/:id/report
```
Allows users to report inappropriate comments.

### Moderation Queue
```
GET /comments/moderation-queue
```
Returns paginated list of comments requiring moderation (admin only).

### Moderate Comment
```
PATCH /comments/:id/moderate
```
Allows admins to approve/reject comments with optional notes.

### Get Comment Reports
```
GET /comments/:id/reports
```
Returns all reports for a specific comment (admin only).

## Database Schema

### CommentReport Model
- Links comments to users who reported them
- Includes reason and optional description
- Prevents duplicate reports with unique constraint

### Comment Model Extensions
- Added moderation tracking fields:
  - `moderationNote`: Admin notes about moderation decision
  - `moderatedBy`: ID of admin who moderated
  - `moderatedAt`: Timestamp of moderation action

## Status Flow

1. **PENDING**: New comments await initial review
2. **FLAGGED**: Comments reported by users need admin attention
3. **APPROVED**: Comments approved for public display
4. **REJECTED**: Comments rejected and hidden from public

## Security Features

- Role-based access control (only admins can moderate)
- Input validation on all endpoints
- Prevents users from reporting their own comments multiple times
- Audit trail for all moderation actions