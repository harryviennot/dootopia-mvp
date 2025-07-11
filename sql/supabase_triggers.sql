-- Supabase Triggers and Functions for Dootopia MVP
-- This file contains triggers and functions for automated operations

-- Function to create event chat when event is created
CREATE OR REPLACE FUNCTION create_event_chat()
RETURNS TRIGGER AS $$
BEGIN
    -- Create chat for the event
    INSERT INTO chats (type, event_id, created_by)
    VALUES ('event', NEW.id, NEW.host_id);
    
    -- Add host as chat participant and admin
    INSERT INTO chat_participants (chat_id, user_id, is_admin)
    VALUES (currval('chats_id_seq'), NEW.host_id, true);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create event chat when event is created
CREATE TRIGGER on_event_created
    AFTER INSERT ON events
    FOR EACH ROW
    EXECUTE FUNCTION create_event_chat();

-- Function to handle friend request acceptance
CREATE OR REPLACE FUNCTION handle_friend_request_acceptance()
RETURNS TRIGGER AS $$
BEGIN
    -- If friend request is accepted, create friendship
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        INSERT INTO friends (user_id1, user_id2)
        VALUES (
            LEAST(NEW.sender_id, NEW.receiver_id),
            GREATEST(NEW.sender_id, NEW.receiver_id)
        )
        ON CONFLICT (user_id1, user_id2) DO NOTHING;
        
        -- Update responded_at timestamp
        NEW.responded_at = NOW();
        
        -- Create notification for sender
        INSERT INTO notifications (user_id, type, title, body, related_id, related_type)
        VALUES (
            NEW.sender_id,
            'friend_request',
            'Friend request accepted',
            (SELECT name FROM users WHERE id = NEW.receiver_id) || ' accepted your friend request',
            NEW.id,
            'friend_request'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for friend request acceptance
CREATE TRIGGER on_friend_request_updated
    BEFORE UPDATE ON friend_requests
    FOR EACH ROW
    EXECUTE FUNCTION handle_friend_request_acceptance();

-- Function to handle guest invitation responses
CREATE OR REPLACE FUNCTION handle_guest_response()
RETURNS TRIGGER AS $$
BEGIN
    -- If guest accepts invitation, add them to event chat
    IF NEW.status = 'accepted' AND OLD.status = 'invited' THEN
        INSERT INTO chat_participants (chat_id, user_id)
        SELECT c.id, NEW.user_id
        FROM chats c
        WHERE c.event_id = NEW.event_id AND c.type = 'event'
        ON CONFLICT (chat_id, user_id) DO NOTHING;
        
        -- Update responded_at timestamp
        NEW.responded_at = NOW();
        
        -- Notify event host
        INSERT INTO notifications (user_id, type, title, body, related_id, related_type)
        VALUES (
            (SELECT host_id FROM events WHERE id = NEW.event_id),
            'guest_response',
            'Guest accepted invitation',
            (SELECT name FROM users WHERE id = NEW.user_id) || ' accepted your event invitation',
            NEW.event_id,
            'event'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for guest responses
CREATE TRIGGER on_guest_response
    BEFORE UPDATE ON guests
    FOR EACH ROW
    EXECUTE FUNCTION handle_guest_response();

-- Function to update items list when contributions change
CREATE OR REPLACE FUNCTION update_item_fulfillment()
RETURNS TRIGGER AS $$
BEGIN
    -- Update quantity_fulfilled in items_list
    IF TG_OP = 'INSERT' THEN
        UPDATE items_list
        SET quantity_fulfilled = quantity_fulfilled + NEW.quantity
        WHERE id = NEW.item_id;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE items_list
        SET quantity_fulfilled = quantity_fulfilled - OLD.quantity + NEW.quantity
        WHERE id = NEW.item_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE items_list
        SET quantity_fulfilled = quantity_fulfilled - OLD.quantity
        WHERE id = OLD.item_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for item contribution changes
CREATE TRIGGER on_item_contribution_insert
    AFTER INSERT ON item_contributions
    FOR EACH ROW
    EXECUTE FUNCTION update_item_fulfillment();

CREATE TRIGGER on_item_contribution_update
    AFTER UPDATE ON item_contributions
    FOR EACH ROW
    EXECUTE FUNCTION update_item_fulfillment();

CREATE TRIGGER on_item_contribution_delete
    AFTER DELETE ON item_contributions
    FOR EACH ROW
    EXECUTE FUNCTION update_item_fulfillment();

-- Function to handle new message notifications
CREATE OR REPLACE FUNCTION notify_chat_participants()
RETURNS TRIGGER AS $$
BEGIN
    -- Create notifications for all chat participants except sender
    INSERT INTO notifications (user_id, type, title, body, related_id, related_type)
    SELECT 
        cp.user_id,
        'new_message',
        'New message',
        CASE 
            WHEN c.type = 'event' THEN 
                'New message in ' || (SELECT title FROM events WHERE id = c.event_id)
            WHEN c.type = 'dm' THEN
                'New message from ' || (SELECT name FROM users WHERE id = NEW.sender_id)
            ELSE
                'New message in ' || COALESCE(c.name, 'group chat')
        END,
        NEW.id,
        'message'
    FROM chat_participants cp
    JOIN chats c ON c.id = cp.chat_id
    WHERE cp.chat_id = NEW.chat_id 
    AND cp.user_id != NEW.sender_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new message notifications
CREATE TRIGGER on_new_message
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_chat_participants();

-- Function to handle media reactions
CREATE OR REPLACE FUNCTION handle_media_reaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify media owner about reaction
    INSERT INTO notifications (user_id, type, title, body, related_id, related_type)
    VALUES (
        (SELECT uploaded_by FROM event_media WHERE id = NEW.media_id),
        'media_reaction',
        'Someone reacted to your media',
        (SELECT name FROM users WHERE id = NEW.user_id) || ' reacted to your media',
        NEW.media_id,
        'media'
    )
    -- Don't notify if user reacted to their own media
    WHERE (SELECT uploaded_by FROM event_media WHERE id = NEW.media_id) != NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for media reactions
CREATE TRIGGER on_media_reaction
    AFTER INSERT ON media_reactions
    FOR EACH ROW
    EXECUTE FUNCTION handle_media_reaction();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at timestamps
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to search users (for friend requests)
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

-- Function to get user's events (as host or guest)
CREATE OR REPLACE FUNCTION get_user_events(user_id_param TEXT)
RETURNS TABLE (
    event_id BIGINT,
    title VARCHAR(255),
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    role TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Events where user is host
    SELECT e.id, e.title, e.description, e.start_time, e.end_time, 'host'::TEXT
    FROM events e
    WHERE e.host_id = user_id_param
    
    UNION ALL
    
    -- Events where user is accepted guest
    SELECT e.id, e.title, e.description, e.start_time, e.end_time, 'guest'::TEXT
    FROM events e
    JOIN guests g ON g.event_id = e.id
    WHERE g.user_id = user_id_param AND g.status = 'accepted'
    
    ORDER BY start_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get event participants
CREATE OR REPLACE FUNCTION get_event_participants(event_id_param BIGINT)
RETURNS TABLE (
    user_id TEXT,
    name VARCHAR(255),
    username VARCHAR(255),
    profile_picture TEXT,
    role TEXT,
    status VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    -- Event host
    SELECT u.id, u.name, u.username, u.profile_picture, 'host'::TEXT, 'accepted'::VARCHAR(50)
    FROM users u
    JOIN events e ON e.host_id = u.id
    WHERE e.id = event_id_param
    
    UNION ALL
    
    -- Event guests
    SELECT u.id, u.name, u.username, u.profile_picture, 'guest'::TEXT, g.status
    FROM users u
    JOIN guests g ON g.user_id = u.id
    WHERE g.event_id = event_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 