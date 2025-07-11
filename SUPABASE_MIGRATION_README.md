# Supabase Migration Guide

This document explains how to migrate from your original `tables.sql` schema to a Supabase-compatible schema with Clerk authentication.

## Files Overview

- `supabase_migration.sql` - Main migration script with all tables and RLS policies
- `supabase_triggers.sql` - Triggers and functions for automated operations
- `tables.sql` - Original schema (for reference)
- `test_mig.sql` - Example Supabase schema (for reference)

## Key Changes from Original Schema

### Authentication Changes

- **Removed**: `password` field from users table (Clerk handles auth)
- **Changed**: `user_id` from `BIGSERIAL` to `TEXT` (Clerk uses string IDs)
- **Added**: `push_token` field for push notifications
- **Added**: Clerk JWT integration with `requesting_user_id()` function

### Database Structure Changes

- **Timestamps**: All timestamps now use `TIMESTAMP WITH TIME ZONE`
- **Foreign Keys**: Added `ON DELETE CASCADE` for proper cleanup
- **Constraints**: Added proper CHECK constraints for enums
- **Indexes**: Implicit indexes on foreign keys and unique constraints
- **IDs**: Changed primary key naming from `table_id` to `id` for consistency

### New Features Added

- **Row Level Security (RLS)**: All tables have comprehensive RLS policies
- **Realtime**: Enabled for chat messages, notifications, and guest responses
- **Storage**: Configured storage bucket for event media with proper policies
- **Automated Operations**: Triggers for:
  - Auto-creating event chats
  - Handling friend request acceptance
  - Managing guest responses
  - Updating item fulfillment quantities
  - Sending notifications
  - Updating timestamps

### Enhanced Security

- **RLS Policies**: Ensure users can only access their own data or data they have permission to see
- **Security Functions**: Helper functions to check permissions (event host, guest, friend, etc.)
- **Storage Policies**: Restrict media uploads/access based on event participation

## Migration Steps

### 1. Set Up Supabase Project

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF
```

### 2. Run Migration Scripts

```bash
# Run main migration
supabase db reset
psql -h YOUR_DB_HOST -U postgres -d postgres -f supabase_migration.sql

# Run triggers and functions
psql -h YOUR_DB_HOST -U postgres -d postgres -f supabase_triggers.sql
```

### 3. Configure Clerk Integration

In your Supabase project settings, add Clerk as a JWT provider:

```sql
-- In Supabase SQL Editor, run:
SELECT auth.create_user('{"sub": "clerk_user_id", "email": "user@example.com"}');
```

### 4. Test the Migration

```sql
-- Test user creation
INSERT INTO users (id, name, username, email)
VALUES ('clerk_user_123', 'Test User', 'testuser', 'test@example.com');

-- Test event creation
INSERT INTO events (host_id, title, description, start_time, end_time)
VALUES ('clerk_user_123', 'Test Event', 'Test Description', NOW() + INTERVAL '1 day', NOW() + INTERVAL '2 days');
```

## RLS Policy Examples

### Users can only see public events or events they're involved in:

```sql
CREATE POLICY "Users can view accessible events" ON events
FOR SELECT TO authenticated USING (
    is_public = true OR
    host_id = requesting_user_id() OR
    is_event_guest(id)
);
```

### Users can only send messages in chats they participate in:

```sql
CREATE POLICY "Users can send messages in their chats" ON chat_messages
FOR INSERT TO authenticated WITH CHECK (
    sender_id = requesting_user_id() AND
    is_chat_participant(chat_id)
);
```

## Storage Configuration

Media files are stored in the `event-media` bucket with the following structure:

```
event-media/
├── {event_id}/
│   ├── image1.jpg
│   ├── image2.png
│   └── video1.mp4
```

## Environment Variables

Update your application to use these environment variables:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
CLERK_SECRET_KEY=your-clerk-secret-key
```

## API Changes Required

### User Authentication

- Remove password-based auth logic
- Integrate Clerk for authentication
- Use Clerk user ID for user identification

### Database Queries

- Update all user ID references from `BIGINT` to `TEXT`
- Use Supabase client with RLS-aware queries
- Handle `auth.uid()` for current user context

### File Uploads

- Use Supabase Storage SDK for media uploads
- Implement proper file organization by event ID
- Handle storage policy permissions

## Common Issues and Solutions

### Issue: RLS blocking queries

**Solution**: Ensure you're using an authenticated Supabase client and the user has proper permissions.

### Issue: Foreign key constraint errors

**Solution**: Verify that referenced records exist and user IDs are correct Clerk format.

### Issue: Storage upload failures

**Solution**: Check that the user is a participant in the event and the file path follows the expected structure.

## Testing Checklist

- [ ] User registration with Clerk
- [ ] User profile updates
- [ ] Event creation and management
- [ ] Friend requests and friendship management
- [ ] Event invitations and responses
- [ ] Chat functionality
- [ ] Media uploads and viewing
- [ ] Notification system
- [ ] Item contributions
- [ ] Fee contributions

## Performance Considerations

- **Indexes**: Consider adding indexes on frequently queried columns
- **Pagination**: Implement pagination for large result sets
- **Caching**: Use Supabase caching for read-heavy operations
- **Realtime**: Subscribe only to necessary real-time updates

## Security Best Practices

- **Never bypass RLS**: Always use authenticated clients
- **Validate input**: Add proper validation on the client side
- **Audit logs**: Consider adding audit trails for sensitive operations
- **Rate limiting**: Implement rate limiting for API endpoints
- **Data encryption**: Consider encrypting sensitive data at rest

## Next Steps

1. Update your application code to use Supabase client
2. Implement Clerk authentication flow
3. Test all functionality thoroughly
4. Deploy to staging environment
5. Perform load testing
6. Deploy to production

For questions or issues, refer to the [Supabase documentation](https://supabase.com/docs) and [Clerk documentation](https://clerk.com/docs).
