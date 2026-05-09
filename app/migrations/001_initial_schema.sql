-- Drop and recreate -- this is a hackathon, no data migration needed

DROP TABLE IF EXISTS list_items CASCADE;
DROP TABLE IF EXISTS shopping_lists CASCADE;
DROP TABLE IF EXISTS scans CASCADE;
DROP TABLE IF EXISTS equivalences CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================
-- PROFILES (one per auth user)
-- =============================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,

    -- Cultural identity
    home_country TEXT,
    home_region TEXT,
    home_cuisines TEXT[] DEFAULT '{}',
    repertoire TEXT[] DEFAULT '{}',
    preferred_language TEXT DEFAULT 'English',

    -- Dietary
    dietary_preferences TEXT[] DEFAULT '{}',
    allergies TEXT[] DEFAULT '{}',

    -- Cooking confidence (1-5)
    cooking_confidence INT DEFAULT 3 CHECK (cooking_confidence BETWEEN 1 AND 5),

    -- Location
    home_lat NUMERIC,
    home_lng NUMERIC,
    home_city TEXT,

    -- State
    onboarding_completed BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================
-- SCANS (every product scanned)
-- =============================
CREATE TABLE scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    image_url TEXT,

    detected_product TEXT,
    detected_brand TEXT,
    detected_category TEXT,

    cultural_equivalent TEXT,
    match_score INT CHECK (match_score BETWEEN 0 AND 100),
    ai_tip TEXT,
    can_make_at_home BOOLEAN DEFAULT FALSE,
    home_recipe_summary TEXT,
    real_version_name TEXT,

    raw_vision_response JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scans_user_time ON scans(user_id, created_at DESC);

-- =============================
-- SHOPPING LISTS (recipe imports)
-- =============================
CREATE TABLE shopping_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source_dish TEXT,
    status TEXT CHECK (status IN ('planning', 'shopping', 'completed')) DEFAULT 'planning',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lists_user ON shopping_lists(user_id);

CREATE TABLE list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,

    original_ingredient TEXT NOT NULL,
    us_equivalent_brand TEXT,
    us_equivalent_product TEXT,
    match_score INT CHECK (match_score BETWEEN 0 AND 100),
    aisle_location TEXT,
    ai_tip TEXT,
    can_make_at_home BOOLEAN DEFAULT FALSE,

    is_checked BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_list_items_list ON list_items(list_id);

-- =============================
-- EQUIVALENCES (curated cultural data)
-- =============================
CREATE TABLE equivalences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_item TEXT NOT NULL,
    home_cuisine TEXT NOT NULL,
    us_equivalent TEXT NOT NULL,
    us_brand TEXT,
    match_score INT CHECK (match_score BETWEEN 0 AND 100),
    notes TEXT,
    can_make_at_home BOOLEAN DEFAULT FALSE,
    home_recipe_summary TEXT,
    aisle_hint TEXT
);

CREATE INDEX idx_equiv_lookup ON equivalences(home_cuisine, home_item);

-- =============================
-- RLS POLICIES (essential)
-- =============================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE equivalences ENABLE ROW LEVEL SECURITY;

-- Profiles: users see/edit own only
CREATE POLICY "users_own_profile" ON profiles FOR ALL TO authenticated
    USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Scans: users see/edit own only
CREATE POLICY "users_own_scans" ON scans FOR ALL TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Lists: users see/edit own only
CREATE POLICY "users_own_lists" ON shopping_lists FOR ALL TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- List items: users see/edit items in their own lists
CREATE POLICY "users_own_list_items" ON list_items FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM shopping_lists sl WHERE sl.id = list_items.list_id AND sl.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM shopping_lists sl WHERE sl.id = list_items.list_id AND sl.user_id = auth.uid()));

-- Equivalences: global read (it's curated data)
CREATE POLICY "everyone_reads_equivalences" ON equivalences FOR SELECT TO authenticated USING (true);

-- =============================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
