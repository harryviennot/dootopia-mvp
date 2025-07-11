-- Table: users
CREATE TABLE IF NOT EXISTS users (
    user_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    username VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    birth_date DATE,
    profile_picture TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: events
CREATE TABLE IF NOT EXISTS events (
    event_id BIGSERIAL PRIMARY KEY,
    host_id BIGINT REFERENCES users(user_id),
    location_id BIGINT REFERENCES locations(place_id),
    title VARCHAR(255),
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    contribution_type VARCHAR(50), -- ENUM simulation
    minimum_fee DECIMAL(10, 2),
    payment_link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: event_posts
CREATE TABLE IF NOT EXISTS event_posts (
    post_id BIGSERIAL PRIMARY KEY,
    event_id BIGINT REFERENCES events(event_id),
    uploaded_by BIGINT REFERENCES users(user_id),
    caption TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: event_media
CREATE TABLE IF NOT EXISTS event_media (
    media_id BIGSERIAL PRIMARY KEY,
    post_id BIGINT REFERENCES event_posts(post_id),
    event_id BIGINT REFERENCES events(event_id),
    media_url TEXT,
    media_type VARCHAR(50), -- ENUM simulation
    uploaded_by BIGINT REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: media_favorites
CREATE TABLE IF NOT EXISTS media_favorites (
    favorite_id BIGSERIAL PRIMARY KEY,
    media_id BIGINT REFERENCES event_media(media_id),
    user_id BIGINT REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: friends
CREATE TABLE IF NOT EXISTS friends (
    user_id1 BIGINT REFERENCES users(user_id),
    user_id2 BIGINT REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id1, user_id2)
);

-- Table: friend_requests
CREATE TABLE IF NOT EXISTS friend_requests (
    request_id BIGSERIAL PRIMARY KEY,
    sender_id BIGINT REFERENCES users(user_id),
    receiver_id BIGINT REFERENCES users(user_id),
    status VARCHAR(50) DEFAULT 'pending', -- ENUM simulation ('pending', 'accepted', 'declined')
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP
);

-- Table: guests
CREATE TABLE IF NOT EXISTS guests (
    guest_id BIGSERIAL PRIMARY KEY,
    event_id BIGINT REFERENCES events(event_id),
    user_id BIGINT REFERENCES users(user_id),
    status VARCHAR(50) DEFAULT 'invited', -- ENUM simulation ('invited', 'accepted', 'declined')
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP
);

-- Table: chats
CREATE TABLE IF NOT EXISTS chats (
    chat_id BIGSERIAL PRIMARY KEY,
    type VARCHAR(50), -- ENUM simulation ('event', 'dm')
    event_id BIGINT REFERENCES events(event_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: chat_participants
CREATE TABLE IF NOT EXISTS chat_participants (
    participant_id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT REFERENCES chats(chat_id),
    user_id BIGINT REFERENCES users(user_id),
    is_admin BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
    message_id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT REFERENCES chats(chat_id),
    sender_id BIGINT REFERENCES users(user_id),
    content TEXT,
    message_type VARCHAR(50), -- ENUM simulation ('text', 'media', 'voice')
    media_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: media_reactions
CREATE TABLE IF NOT EXISTS media_reactions (
    reaction_id BIGSERIAL PRIMARY KEY,
    media_id BIGINT REFERENCES event_media(media_id),
    user_id BIGINT REFERENCES users(user_id),
    reaction_type VARCHAR(50), -- ENUM simulation ('like', 'love', 'haha', etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id),
    type VARCHAR(50), -- ENUM simulation
    message TEXT,
    related_id BIGINT, -- Can reference any related entity
    related_type VARCHAR(50), -- ENUM simulation for entity type
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: fee_contributions
CREATE TABLE IF NOT EXISTS fee_contributions (
    fee_id BIGSERIAL PRIMARY KEY,
    event_id BIGINT REFERENCES events(event_id),
    user_id BIGINT REFERENCES users(user_id),
    amount DECIMAL(10, 2),
    status VARCHAR(50), -- ENUM simulation ('pending', 'validated')
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: items_list
CREATE TABLE IF NOT EXISTS items_list (
    item_id BIGSERIAL PRIMARY KEY,
    event_id BIGINT REFERENCES events(event_id),
    item_name VARCHAR(255),
    quantity_needed INT NOT NULL,
    quantity_fulfilled INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: item_contributions
CREATE TABLE IF NOT EXISTS item_contributions (
    contribution_id BIGSERIAL PRIMARY KEY,
    item_id BIGINT REFERENCES items_list(item_id),
    user_id BIGINT REFERENCES users(user_id),
    quantity INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: places
CREATE TABLE IF NOT EXISTS locations (
    id BIGSERIAL,
    user_id BIGINT REFERENCES users(user_id),
    place_id VARCHAR(255) PRIMARY KEY,
    formatted_address TEXT,
    label VARCHAR(255),
    coordinates JSONB,
    components JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);