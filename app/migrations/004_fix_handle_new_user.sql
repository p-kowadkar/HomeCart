-- Migration 004: harden handle_new_user trigger
-- Background: GoTrue admin user creation was returning
--   "Database error creating new user" (500, unexpected_failure)
-- which means the AFTER INSERT trigger on auth.users threw and aborted the
-- transaction. The original trigger (migration 001) silently aborts on any
-- exception. This rewrite makes the trigger exception-safe so a profile-row
-- failure can never block account creation, and logs the cause to the
-- Postgres logs so it can be diagnosed.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Never block the auth.users insert just because the profile-side write
    -- choked. The app will lazy-create the profile row if it's missing on
    -- next login. Log so we can find this in Postgres logs.
    RAISE WARNING 'handle_new_user failed for user % : % %',
        NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
