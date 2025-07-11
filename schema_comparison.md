# Schema Comparison: Original vs Supabase + Clerk

This document provides a detailed comparison between your original schema and the new Supabase-compatible schema.

## Table Structure Changes

| Original Table       | New Table            | Key Changes                                                                                                                                                        |
| -------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `users`              | `users`              | - Removed `password` field<br/>- Changed `user_id` (BIGSERIAL) → `id` (TEXT)<br/>- Added `push_token` field<br/>- Updated timestamps to TIMESTAMPTZ                |
| `events`             | `events`             | - Changed `event_id` → `id`<br/>- Updated all user references to TEXT<br/>- Added `is_public` and `max_guests` fields<br/>- Enhanced contribution_type constraints |
| `event_posts`        | `event_posts`        | - Changed `post_id` → `id`<br/>- Updated foreign key references                                                                                                    |
| `event_media`        | `event_media`        | - Changed `media_id` → `id`<br/>- Enhanced media_type constraints                                                                                                  |
| `media_favorites`    | `media_favorites`    | - Changed `favorite_id` → `id`<br/>- Added unique constraint on (media_id, user_id)                                                                                |
| `friends`            | `friends`            | - Added CHECK constraint for user ordering<br/>- Enhanced foreign key constraints                                                                                  |
| `friend_requests`    | `friend_requests`    | - Changed `request_id` → `id`<br/>- Added unique constraint on (sender_id, receiver_id)                                                                            |
| `guests`             | `guests`             | - Changed `guest_id` → `id`<br/>- Added 'maybe' status option<br/>- Added unique constraint on (event_id, user_id)                                                 |
| `chats`              | `chats`              | - Changed `chat_id` → `id`<br/>- Added `name` and `created_by` fields<br/>- Enhanced type constraints                                                              |
| `chat_participants`  | `chat_participants`  | - Changed `participant_id` → `id`<br/>- Added unique constraint on (chat_id, user_id)                                                                              |
| `chat_messages`      | `chat_messages`      | - Changed `message_id` → `id`<br/>- Added `reply_to` field for message threading<br/>- Enhanced message_type constraints                                           |
| `media_reactions`    | `media_reactions`    | - Changed `reaction_id` → `id`<br/>- Enhanced reaction_type constraints<br/>- Added unique constraint on (media_id, user_id)                                       |
| `notifications`      | `notifications`      | - Changed `notification_id` → `id`<br/>- Added `title` field<br/>- Enhanced type constraints                                                                       |
| `fee_contributions`  | `fee_contributions`  | - Changed `fee_id` → `id`<br/>- Added `payment_reference` field<br/>- Added unique constraint on (event_id, user_id)                                               |
| `items_list`         | `items_list`         | - Changed `item_id` → `id`<br/>- Added `created_by` field<br/>- Enhanced quantity constraints                                                                      |
| `item_contributions` | `item_contributions` | - Changed `contribution_id` → `id`<br/>- Enhanced quantity constraints                                                                                             |
| `locations`          | `locations`          | - Kept `place_id` as PRIMARY KEY<br/>- Updated user_id reference to TEXT                                                                                           |

## Field-Level Changes

### Users Table

| Original Field | New Field    | Change Description               |
| -------------- | ------------ | -------------------------------- |
| `user_id`      | `id`         | BIGSERIAL → TEXT (Clerk user ID) |
| `password`     | ❌ Removed   | Authentication handled by Clerk  |
| ❌             | `push_token` | Added for push notifications     |
| `created_at`   | `created_at` | TIMESTAMP → TIMESTAMPTZ          |
| `updated_at`   | `updated_at` | TIMESTAMP → TIMESTAMPTZ          |

### Events Table

| Original Field      | New Field           | Change Description        |
| ------------------- | ------------------- | ------------------------- |
| `event_id`          | `id`                | Renamed primary key       |
| `host_id`           | `host_id`           | BIGINT → TEXT             |
| `location_id`       | `location_id`       | No change (still VARCHAR) |
| `contribution_type` | `contribution_type` | Added CHECK constraint    |
| ❌                  | `is_public`         | Added BOOLEAN field       |
| ❌                  | `max_guests`        | Added INTEGER field       |
| `created_at`        | `created_at`        | TIMESTAMP → TIMESTAMPTZ   |
| `updated_at`        | `updated_at`        | TIMESTAMP → TIMESTAMPTZ   |

## New Security Features

### Row Level Security (RLS) Policies

- **Users**: Can view all profiles, update only their own
- **Events**: Can view public events or events they're involved in
- **Media**: Can view media for accessible events
- **Friends**: Can view and manage their own friendships
- **Chats**: Can only access chats they participate in
- **Notifications**: Can only view their own notifications

### Helper Functions

- `requesting_user_id()` - Get current authenticated user ID
- `is_event_host(event_id)` - Check if user is event host
- `is_event_guest(event_id)` - Check if user is event guest
- `is_friends_with(user_id)` - Check friendship status
- `is_chat_participant(chat_id)` - Check chat participation

## New Automated Features

### Triggers

- **Event Creation**: Auto-create event chat and add host as admin
- **Friend Requests**: Auto-create friendship when accepted
- **Guest Responses**: Auto-add accepted guests to event chat
- **Item Contributions**: Auto-update fulfilled quantities
- **Messages**: Auto-notify chat participants
- **Media Reactions**: Auto-notify media owners
- **Timestamps**: Auto-update `updated_at` fields

### Utility Functions

- `search_users(search_term)` - Search users by name/username/email
- `get_user_events(user_id)` - Get events for a user (as host or guest)
- `get_event_participants(event_id)` - Get all participants for an event

## Storage Configuration

### Original Setup

- File storage handled externally
- No built-in permissions system

### New Setup

- **Supabase Storage**: Built-in file storage with bucket policies
- **Organized Structure**: Files organized by event ID
- **Permission-based Access**: Users can only access media for events they participate in

## Database Constraints

### Enhanced Constraints

- **CHECK Constraints**: Added for enum-like fields (status, type, etc.)
- **UNIQUE Constraints**: Added to prevent duplicate relationships
- **Foreign Key Constraints**: Enhanced with ON DELETE CASCADE
- **NOT NULL Constraints**: Added where appropriate

### Validation Examples

```sql
-- Event contribution types
contribution_type CHECK (contribution_type IN ('none', 'fee', 'items', 'both'))

-- Friend request status
status CHECK (status IN ('pending', 'accepted', 'declined'))

-- Media reactions
reaction_type CHECK (reaction_type IN ('like', 'love', 'haha', 'wow', 'sad', 'angry'))
```

## Performance Optimizations

### Indexes

- **Primary Keys**: All tables have proper primary keys
- **Foreign Keys**: Automatic indexes on foreign key columns
- **Unique Constraints**: Automatic indexes on unique columns
- **Search Optimization**: Function-based search with ranking

### Query Optimization

- **RLS Integration**: Policies designed for efficient query execution
- **Helper Functions**: Cached permission checks
- **Pagination Ready**: Structure supports efficient pagination

## Migration Considerations

### Data Type Changes

- All `BIGINT` user IDs need to be converted to `TEXT`
- Timestamps need timezone information
- Enum fields need validation

### Application Code Changes

- Update all user ID handling
- Implement Clerk authentication
- Update API endpoints for new constraints
- Add RLS-aware queries

### Testing Requirements

- Verify all RLS policies work correctly
- Test trigger functionality
- Validate storage permissions
- Check performance with realistic data volumes

This migration significantly enhances security, performance, and maintainability while preserving all original functionality.
