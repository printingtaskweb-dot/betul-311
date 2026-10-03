-- =========================================================================
-- SQL Command to Make 'ouikey41@gmail.com' an Admin
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ywwkivrdjyaoovfsxnzp/sql
-- =========================================================================

-- 1. Add is_admin column to user_profiles table if not present
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- 2. If the user ouikey41@gmail.com has already registered or logged in,
-- set is_admin to true in user_profiles
UPDATE user_profiles
SET is_admin = true
WHERE id IN (
  SELECT id FROM auth.users WHERE lower(email) = 'ouikey41@gmail.com'
);

-- 3. In case the user_profiles row doesn't exist yet for ouikey41@gmail.com,
-- insert it directly linking to their auth.users record:
INSERT INTO user_profiles (id, full_name, language, is_admin)
SELECT id, 'Admin', 'en', true
FROM auth.users
WHERE lower(email) = 'ouikey41@gmail.com'
ON CONFLICT (id) DO UPDATE SET is_admin = true;

-- 4. Create an automatic trigger so if ouikey41@gmail.com signs up in the future,
-- they automatically receive admin privileges:
CREATE OR REPLACE FUNCTION public.handle_new_user_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF lower(NEW.email) = 'ouikey41@gmail.com' THEN
    INSERT INTO public.user_profiles (id, full_name, language, is_admin)
    VALUES (NEW.id, 'Admin', 'en', true)
    ON CONFLICT (id) DO UPDATE SET is_admin = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_admin();

-- 5. Verify the admin status
SELECT u.id, u.email, p.is_admin, p.full_name
FROM auth.users u
LEFT JOIN user_profiles p ON p.id = u.id
WHERE lower(u.email) = 'ouikey41@gmail.com';
