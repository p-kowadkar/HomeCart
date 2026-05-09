-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_country TEXT NOT NULL,
    preferred_language TEXT NOT NULL,
    dietary_preferences TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Shopping Lists Table
CREATE TABLE IF NOT EXISTS shopping_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT CHECK (status IN ('planning', 'shopping', 'completed')) DEFAULT 'planning',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. List Items Table
CREATE TABLE IF NOT EXISTS list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
    original_ingredient TEXT NOT NULL,
    us_equivalent_brand TEXT,
    match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
    aisle_location TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    ai_tip TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies (Basic Setup)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;

-- Note: In a production app, we would add specific user-based policies here.
