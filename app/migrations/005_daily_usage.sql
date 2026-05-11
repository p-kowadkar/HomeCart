-- Migration 005: per-user daily usage counters for free-tier rate limiting.
--
-- Background: when a user does NOT supply a BYOK LLM key, /scan and /recipe
-- burn the operator's OpenRouter credits. To bound the worst case we cap
-- non-BYOK calls at 10 scans + 3 recipes per user per day. BYOK calls bypass
-- this table entirely (they cost the user, not the operator).
--
-- The (user_id, usage_date) primary key gives us atomic upserts via
-- INSERT ... ON CONFLICT DO UPDATE. Old rows can be pruned weekly via a
-- scheduled job if storage becomes a concern; for now we keep history for
-- light usage analytics.

CREATE TABLE IF NOT EXISTS public.daily_usage (
    user_id       uuid    NOT NULL,
    usage_date    date    NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
    scans_used    integer NOT NULL DEFAULT 0,
    recipes_used  integer NOT NULL DEFAULT 0,
    updated_at    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, usage_date)
);

-- Service role on the backend handles inserts/updates directly. Users never
-- read this table from the client, so RLS stays restrictive.
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_usage owner read" ON public.daily_usage;
CREATE POLICY "daily_usage owner read"
    ON public.daily_usage FOR SELECT
    USING (auth.uid() = user_id);

-- Index for "today's row" lookups; primary key already covers (user_id, usage_date)
-- so this is mostly a no-op, kept here for clarity.
CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date
    ON public.daily_usage (user_id, usage_date DESC);
