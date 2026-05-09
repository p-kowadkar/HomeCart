-- Cache for nearby store searches (key: rounded lat/lon + cuisine)
CREATE TABLE public.store_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,  -- "lat:40.72,lon:-74.04,cuisine:indian"
  results JSONB NOT NULL,           -- array of store objects
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_store_cache_key ON public.store_cache(cache_key);
CREATE INDEX idx_store_cache_created ON public.store_cache(created_at);

-- Hand-curated chain personas
CREATE TABLE public.chain_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_name TEXT NOT NULL,
  chain_aliases TEXT[] DEFAULT '{}',  -- alt names: ["whole foods market", "wfm"]
  cuisines TEXT[] NOT NULL,           -- which cuisines: ["italian", "general"]
  authenticity_tier INT NOT NULL,     -- 1=specialty ethnic, 2=premium general, 3=mainstream, 4=budget
  price_tier INT NOT NULL,            -- 1=budget, 2=mid, 3=premium
  notes TEXT
);

CREATE INDEX idx_chain_personas_name ON public.chain_personas(chain_name);
CREATE INDEX idx_chain_personas_cuisines ON public.chain_personas USING gin(cuisines);

ALTER TABLE public.store_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chain_personas ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read both
CREATE POLICY "Authenticated users can read store_cache"
  ON public.store_cache FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read chain_personas"
  ON public.chain_personas FOR SELECT TO authenticated USING (true);

-- Backend service role writes to store_cache
CREATE POLICY "Service role manages store_cache"
  ON public.store_cache FOR ALL TO service_role USING (true) WITH CHECK (true);
