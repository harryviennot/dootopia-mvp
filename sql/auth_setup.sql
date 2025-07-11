-- Authentication Setup for Supabase + Clerk Integration
-- This file contains only the auth-related queries needed for initial setup

-- ============================================================================
-- 1. JWT Integration Function
-- ============================================================================

-- Function to get JWT user id (Clerk integration)
-- This extracts the user ID from the JWT token provided by Clerk
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
    SELECT NULLIF(
        current_setting('request.jwt.claims', true)::json->>'sub',
        ''
    )::text;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- 2. Users Table (Auth-related)
-- ============================================================================

-- Create users table with Clerk-compatible ID format
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, -- Clerk user ID (not auto-generated)
    name VARCHAR(255),
    username VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    birth_date DATE,
    profile_picture TEXT,
    push_token TEXT, -- For push notifications
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 3. Row Level Security for Users
-- ============================================================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view all user profiles (for social features)
CREATE POLICY "Users can view all user profiles" 
ON users FOR SELECT TO authenticated 
USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update their own profile" 
ON users FOR UPDATE TO authenticated 
USING (id = requesting_user_id());

-- Users can insert their own profile (for initial user creation)
CREATE POLICY "Users can insert their own profile" 
ON users FOR INSERT TO authenticated 
WITH CHECK (id = requesting_user_id());

-- ============================================================================
-- 4. User Profile Update Trigger
-- ============================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table timestamp updates
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. User Search Function (for finding friends)
-- ============================================================================

-- Function to search users (for friend requests and social features)
CREATE OR REPLACE FUNCTION search_users(search_term TEXT)
RETURNS SETOF users AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM users u
    WHERE 
        u.username ILIKE '%' || search_term || '%'
        OR u.name ILIKE '%' || search_term || '%'
        OR u.email ILIKE '%' || search_term || '%'
    ORDER BY
        CASE 
            WHEN u.username ILIKE search_term || '%' THEN 1
            WHEN u.name ILIKE search_term || '%' THEN 2
            WHEN u.username ILIKE '%' || search_term || '%' THEN 3
            WHEN u.name ILIKE '%' || search_term || '%' THEN 4
            ELSE 5
        END
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Initial Test User Creation (Optional - for testing)
-- ============================================================================

-- Example function to create a test user (remove in production)
CREATE OR REPLACE FUNCTION create_test_user(
    user_id TEXT,
    user_name TEXT,
    user_email TEXT,
    user_username TEXT DEFAULT NULL
)
RETURNS users AS $$
DECLARE
    new_user users;
BEGIN
    INSERT INTO users (id, name, email, username)
    VALUES (user_id, user_name, user_email, COALESCE(user_username, LOWER(user_name)))
    RETURNING * INTO new_user;
    
    RETURN new_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. User Profile Helper Functions
-- ============================================================================

-- Function to get current user profile
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS users AS $$
DECLARE
    current_user users;
BEGIN
    SELECT * INTO current_user
    FROM users
    WHERE id = requesting_user_id();
    
    RETURN current_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if username is available
CREATE OR REPLACE FUNCTION is_username_available(username_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS(
        SELECT 1 FROM users 
        WHERE username = username_to_check
        AND id != requesting_user_id()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. Database Grants (if needed)
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- 9. Realtime Setup for User Updates (Optional)
-- ============================================================================

-- Enable realtime for user updates (useful for online status, profile changes)
-- Uncomment if you want real-time user profile updates
-- ALTER TABLE users REPLICA IDENTITY FULL;

-- ============================================================================
-- Testing Queries (Remove in production)
-- ============================================================================

-- Test the auth setup with these queries:

-- 1. Test user creation
-- SELECT create_test_user('test_clerk_user_123', 'Test User', 'test@example.com', 'testuser');

-- 2. Test user search
-- SELECT * FROM search_users('test');

-- 3. Test username availability
-- SELECT is_username_available('newusername');

-- 4. Test current user profile (requires authenticated session)
-- SELECT * FROM get_current_user_profile();

-- ============================================================================
-- Notes for Application Integration
-- ============================================================================

/*
To integrate with your application:

1. Environment Variables:
   - SUPABASE_URL: Your Supabase project URL
   - SUPABASE_ANON_KEY: Your Supabase anonymous key
   - CLERK_PUBLISHABLE_KEY: Your Clerk publishable key
   - CLERK_SECRET_KEY: Your Clerk secret key

2. Clerk Configuration:
   - Configure Clerk to send JWT tokens to Supabase
   - Set up Clerk webhooks for user creation/updates
   - Use Clerk's user ID as the primary key in your users table

3. Application Code:
   - Use Clerk for authentication UI and session management
   - Use Supabase client for database operations
   - Ensure all database calls are made with authenticated Supabase client

4. User Creation Flow:
   - User signs up with Clerk
   - Clerk webhook creates user record in Supabase
   - Or create user on first app login using Clerk user data

Example JavaScript user creation:
```javascript
const { data, error } = await supabase
  .from('users')
  .insert([
    {
      id: clerkUser.id,
      name: clerkUser.firstName + ' ' + clerkUser.lastName,
      email: clerkUser.emailAddresses[0].emailAddress,
      username: clerkUser.username
    }
  ]);
```
*/ 