-- Supabase Migration for Dootopia MVP
-- Adapted from tables.sql to work with Supabase + Clerk auth

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS item_contributions;
DROP TABLE IF EXISTS items_list;
DROP TABLE IF EXISTS fee_contributions;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS media_reactions;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_participants;
DROP TABLE IF EXISTS chats;
DROP TABLE IF EXISTS guests;
DROP TABLE IF EXISTS friend_requests;
DROP TABLE IF EXISTS friends;
DROP TABLE IF EXISTS media_favorites;
DROP TABLE IF EXISTS event_media;
DROP TABLE IF EXISTS event_posts;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS users;

-- Function to get JWT user id (Clerk integration)
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
    SELECT NULLIF(
        current_setting('request.jwt.claims', true)::json->>'sub',
        ''
    )::text;
$$ LANGUAGE SQL STABLE;

-- Table: users (adapted for Clerk auth)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, -- Clerk user ID
    name VARCHAR(255),
    username VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    birth_date DATE,
    profile_picture TEXT,
    push_token TEXT, -- For push notifications
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: locations
CREATE TABLE IF NOT EXISTS locations (
    id BIGSERIAL,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    place_id VARCHAR(255) PRIMARY KEY,
    formatted_address TEXT,
    label VARCHAR(255),
    coordinates JSONB,
    components JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: events
CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    host_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    location_id VARCHAR(255) REFERENCES locations(place_id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    contribution_type VARCHAR(50) DEFAULT 'none' CHECK (contribution_type IN ('none', 'fee', 'items', 'both')),
    minimum_fee DECIMAL(10, 2),
    payment_link TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    max_guests INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: event_posts
CREATE TABLE IF NOT EXISTS event_posts (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
    uploaded_by TEXT REFERENCES users(id) ON DELETE CASCADE,
    caption TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: event_media
CREATE TABLE IF NOT EXISTS event_media (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT REFERENCES event_posts(id) ON DELETE CASCADE,
    event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type VARCHAR(50) CHECK (media_type IN ('image', 'video', 'audio')) DEFAULT 'image',
    uploaded_by TEXT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: media_favorites
CREATE TABLE IF NOT EXISTS media_favorites (
    id BIGSERIAL PRIMARY KEY,
    media_id BIGINT REFERENCES event_media(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(media_id, user_id)
);

-- Table: media_reactions
CREATE TABLE IF NOT EXISTS media_reactions (
    id BIGSERIAL PRIMARY KEY,
    media_id BIGINT REFERENCES event_media(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(50) CHECK (reaction_type IN ('like', 'love', 'haha', 'wow', 'sad', 'angry')) DEFAULT 'like',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(media_id, user_id)
);

-- Table: friends
CREATE TABLE IF NOT EXISTS friends (
    user_id1 TEXT REFERENCES users(id) ON DELETE CASCADE,
    user_id2 TEXT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id1, user_id2),
    CHECK (user_id1 < user_id2) -- Ensure consistent ordering
);

-- Table: friend_requests
CREATE TABLE IF NOT EXISTS friend_requests (
    id BIGSERIAL PRIMARY KEY,
    sender_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    receiver_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    responded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(sender_id, receiver_id)
);

-- Table: guests
CREATE TABLE IF NOT EXISTS guests (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'maybe')),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    responded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(event_id, user_id)
);

-- Table: chats
CREATE TABLE IF NOT EXISTS chats (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(50) CHECK (type IN ('event', 'dm', 'group')) NOT NULL,
    event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255), -- For group chats
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: chat_participants
CREATE TABLE IF NOT EXISTS chat_participants (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT REFERENCES chats(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    is_admin BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(chat_id, user_id)
);

-- Table: chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT REFERENCES chats(id) ON DELETE CASCADE,
    sender_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    message_type VARCHAR(50) CHECK (message_type IN ('text', 'media', 'voice', 'system')) DEFAULT 'text',
    media_url TEXT,
    reply_to BIGINT REFERENCES chat_messages(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) CHECK (type IN ('friend_request', 'event_invite', 'event_update', 'new_message', 'media_reaction', 'guest_response')) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    related_id BIGINT, -- Can reference any related entity
    related_type VARCHAR(50) CHECK (related_type IN ('event', 'user', 'message', 'media', 'friend_request')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: fee_contributions
CREATE TABLE IF NOT EXISTS fee_contributions (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'refunded')),
    payment_reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(event_id, user_id)
);

-- Table: items_list
CREATE TABLE IF NOT EXISTS items_list (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity_needed INT NOT NULL CHECK (quantity_needed > 0),
    quantity_fulfilled INT DEFAULT 0 CHECK (quantity_fulfilled >= 0),
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: item_contributions
CREATE TABLE IF NOT EXISTS item_contributions (
    id BIGSERIAL PRIMARY KEY,
    item_id BIGINT REFERENCES items_list(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_contributions ENABLE ROW LEVEL SECURITY;

-- Function to check if user is event host
CREATE OR REPLACE FUNCTION is_event_host(event_id BIGINT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS(
        SELECT 1 FROM events 
        WHERE id = event_id AND host_id = requesting_user_id()
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to check if user is event guest
CREATE OR REPLACE FUNCTION is_event_guest(event_id BIGINT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS(
        SELECT 1 FROM guests 
        WHERE event_id = is_event_guest.event_id 
        AND user_id = requesting_user_id()
        AND status IN ('accepted', 'invited')
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to check if user is friends with another user
CREATE OR REPLACE FUNCTION is_friends_with(other_user_id TEXT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS(
        SELECT 1 FROM friends 
        WHERE (user_id1 = requesting_user_id() AND user_id2 = other_user_id)
        OR (user_id1 = other_user_id AND user_id2 = requesting_user_id())
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to check if user is chat participant
CREATE OR REPLACE FUNCTION is_chat_participant(chat_id BIGINT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS(
        SELECT 1 FROM chat_participants 
        WHERE chat_id = is_chat_participant.chat_id 
        AND user_id = requesting_user_id()
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- RLS Policies for users
CREATE POLICY "Users can view all user profiles" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE TO authenticated USING (id = requesting_user_id());
CREATE POLICY "Users can insert their own profile" ON users FOR INSERT TO authenticated WITH CHECK (id = requesting_user_id());

-- RLS Policies for locations
CREATE POLICY "Users can view all locations" ON locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage their own locations" ON locations FOR ALL TO authenticated USING (user_id = requesting_user_id());

-- RLS Policies for events
CREATE POLICY "Users can view public events or events they're involved in" ON events FOR SELECT TO authenticated USING (
    is_public = true OR 
    host_id = requesting_user_id() OR 
    is_event_guest(id)
);
CREATE POLICY "Users can create events" ON events FOR INSERT TO authenticated WITH CHECK (host_id = requesting_user_id());
CREATE POLICY "Event hosts can update their events" ON events FOR UPDATE TO authenticated USING (host_id = requesting_user_id());
CREATE POLICY "Event hosts can delete their events" ON events FOR DELETE TO authenticated USING (host_id = requesting_user_id());

-- RLS Policies for event_posts
CREATE POLICY "Users can view posts for events they have access to" ON event_posts FOR SELECT TO authenticated USING (
    EXISTS(SELECT 1 FROM events WHERE id = event_id AND (is_public = true OR host_id = requesting_user_id() OR is_event_guest(id)))
);
CREATE POLICY "Users can create posts for events they're involved in" ON event_posts FOR INSERT TO authenticated WITH CHECK (
    uploaded_by = requesting_user_id() AND 
    (is_event_host(event_id) OR is_event_guest(event_id))
);
CREATE POLICY "Users can update their own posts" ON event_posts FOR UPDATE TO authenticated USING (uploaded_by = requesting_user_id());
CREATE POLICY "Users can delete their own posts" ON event_posts FOR DELETE TO authenticated USING (uploaded_by = requesting_user_id());

-- RLS Policies for event_media
CREATE POLICY "Users can view media for events they have access to" ON event_media FOR SELECT TO authenticated USING (
    EXISTS(SELECT 1 FROM events WHERE id = event_id AND (is_public = true OR host_id = requesting_user_id() OR is_event_guest(id)))
);
CREATE POLICY "Users can upload media for events they're involved in" ON event_media FOR INSERT TO authenticated WITH CHECK (
    uploaded_by = requesting_user_id() AND 
    (is_event_host(event_id) OR is_event_guest(event_id))
);
CREATE POLICY "Users can update their own media" ON event_media FOR UPDATE TO authenticated USING (uploaded_by = requesting_user_id());
CREATE POLICY "Users can delete their own media" ON event_media FOR DELETE TO authenticated USING (uploaded_by = requesting_user_id());

-- RLS Policies for media_favorites
CREATE POLICY "Users can view all media favorites" ON media_favorites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage their own favorites" ON media_favorites FOR ALL TO authenticated USING (user_id = requesting_user_id());

-- RLS Policies for media_reactions
CREATE POLICY "Users can view all media reactions" ON media_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage their own reactions" ON media_reactions FOR ALL TO authenticated USING (user_id = requesting_user_id());

-- RLS Policies for friends
CREATE POLICY "Users can view friendships involving them" ON friends FOR SELECT TO authenticated USING (
    user_id1 = requesting_user_id() OR user_id2 = requesting_user_id()
);
CREATE POLICY "Users can create friendships for themselves" ON friends FOR INSERT TO authenticated WITH CHECK (
    user_id1 = requesting_user_id() OR user_id2 = requesting_user_id()
);
CREATE POLICY "Users can delete their own friendships" ON friends FOR DELETE TO authenticated USING (
    user_id1 = requesting_user_id() OR user_id2 = requesting_user_id()
);

-- RLS Policies for friend_requests
CREATE POLICY "Users can view friend requests involving them" ON friend_requests FOR SELECT TO authenticated USING (
    sender_id = requesting_user_id() OR receiver_id = requesting_user_id()
);
CREATE POLICY "Users can create friend requests as sender" ON friend_requests FOR INSERT TO authenticated WITH CHECK (sender_id = requesting_user_id());
CREATE POLICY "Users can update friend requests they received" ON friend_requests FOR UPDATE TO authenticated USING (receiver_id = requesting_user_id());
CREATE POLICY "Users can delete friend requests they sent" ON friend_requests FOR DELETE TO authenticated USING (sender_id = requesting_user_id());
CREATE POLICY "Users can delete friend requests they received" ON friend_requests FOR DELETE TO authenticated USING (receiver_id = requesting_user_id());

-- RLS Policies for guests
CREATE POLICY "Users can view guests for events they have access to" ON guests FOR SELECT TO authenticated USING (
    user_id = requesting_user_id() OR 
    is_event_host(event_id) OR 
    is_event_guest(event_id)
);
CREATE POLICY "Event hosts can manage guests" ON guests FOR INSERT TO authenticated WITH CHECK (is_event_host(event_id));
CREATE POLICY "Users can update their own guest status" ON guests FOR UPDATE TO authenticated USING (
    user_id = requesting_user_id() OR is_event_host(event_id)
);
CREATE POLICY "Event hosts can delete guests" ON guests FOR DELETE TO authenticated USING (is_event_host(event_id));

-- RLS Policies for chats
CREATE POLICY "Users can view chats they participate in" ON chats FOR SELECT TO authenticated USING (is_chat_participant(id));
CREATE POLICY "Users can create chats" ON chats FOR INSERT TO authenticated WITH CHECK (created_by = requesting_user_id());
CREATE POLICY "Chat admins can update chats" ON chats FOR UPDATE TO authenticated USING (
    EXISTS(SELECT 1 FROM chat_participants WHERE chat_id = id AND user_id = requesting_user_id() AND is_admin = true)
);

-- RLS Policies for chat_participants
CREATE POLICY "Users can view participants in chats they're in" ON chat_participants FOR SELECT TO authenticated USING (is_chat_participant(chat_id));
CREATE POLICY "Chat admins can manage participants" ON chat_participants FOR INSERT TO authenticated WITH CHECK (
    user_id = requesting_user_id() OR
    EXISTS(SELECT 1 FROM chat_participants WHERE chat_id = chat_participants.chat_id AND user_id = requesting_user_id() AND is_admin = true)
);
CREATE POLICY "Users can leave chats" ON chat_participants FOR DELETE TO authenticated USING (
    user_id = requesting_user_id() OR
    EXISTS(SELECT 1 FROM chat_participants WHERE chat_id = chat_participants.chat_id AND user_id = requesting_user_id() AND is_admin = true)
);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in chats they participate in" ON chat_messages FOR SELECT TO authenticated USING (is_chat_participant(chat_id));
CREATE POLICY "Users can send messages in chats they participate in" ON chat_messages FOR INSERT TO authenticated WITH CHECK (
    sender_id = requesting_user_id() AND is_chat_participant(chat_id)
);
CREATE POLICY "Users can update their own messages" ON chat_messages FOR UPDATE TO authenticated USING (sender_id = requesting_user_id());
CREATE POLICY "Users can delete their own messages" ON chat_messages FOR DELETE TO authenticated USING (sender_id = requesting_user_id());

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT TO authenticated USING (user_id = requesting_user_id());
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE TO authenticated USING (user_id = requesting_user_id());
CREATE POLICY "System can create notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for fee_contributions
CREATE POLICY "Users can view contributions for events they have access to" ON fee_contributions FOR SELECT TO authenticated USING (
    user_id = requesting_user_id() OR 
    is_event_host(event_id) OR 
    is_event_guest(event_id)
);
CREATE POLICY "Users can create their own contributions" ON fee_contributions FOR INSERT TO authenticated WITH CHECK (user_id = requesting_user_id());
CREATE POLICY "Users can update their own contributions" ON fee_contributions FOR UPDATE TO authenticated USING (user_id = requesting_user_id());

-- RLS Policies for items_list
CREATE POLICY "Users can view items for events they have access to" ON items_list FOR SELECT TO authenticated USING (
    is_event_host(event_id) OR is_event_guest(event_id)
);
CREATE POLICY "Event hosts can manage items list" ON items_list FOR ALL TO authenticated USING (is_event_host(event_id));

-- RLS Policies for item_contributions
CREATE POLICY "Users can view item contributions for events they have access to" ON item_contributions FOR SELECT TO authenticated USING (
    user_id = requesting_user_id() OR 
    EXISTS(SELECT 1 FROM items_list WHERE id = item_id AND (is_event_host(event_id) OR is_event_guest(event_id)))
);
CREATE POLICY "Users can create their own item contributions" ON item_contributions FOR INSERT TO authenticated WITH CHECK (user_id = requesting_user_id());
CREATE POLICY "Users can update their own item contributions" ON item_contributions FOR UPDATE TO authenticated USING (user_id = requesting_user_id());
CREATE POLICY "Users can delete their own item contributions" ON item_contributions FOR DELETE TO authenticated USING (user_id = requesting_user_id());

-- Enable realtime for important tables
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE guests REPLICA IDENTITY FULL;
ALTER TABLE friend_requests REPLICA IDENTITY FULL;

-- Create storage bucket for media files
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-media', 'event-media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for event media
CREATE POLICY "Users can upload media for events they're involved in" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'event-media' AND
    auth.uid()::text IN (
        SELECT host_id FROM events WHERE id = (storage.foldername(name))[1]::bigint
        UNION
        SELECT user_id FROM guests WHERE event_id = (storage.foldername(name))[1]::bigint AND status = 'accepted'
    )
);

CREATE POLICY "Users can view media for events they have access to" ON storage.objects
FOR SELECT TO authenticated USING (
    bucket_id = 'event-media' AND
    auth.uid()::text IN (
        SELECT host_id FROM events WHERE id = (storage.foldername(name))[1]::bigint
        UNION
        SELECT user_id FROM guests WHERE event_id = (storage.foldername(name))[1]::bigint AND status IN ('accepted', 'invited')
    )
);

CREATE POLICY "Users can delete their own uploaded media" ON storage.objects
FOR DELETE TO authenticated USING (
    bucket_id = 'event-media' AND
    auth.uid()::text = owner
); 