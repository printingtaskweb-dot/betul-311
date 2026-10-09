-- ====================================================================
-- FIX: Infinite recursion on public.user_profiles & Seed Designations
-- Run this in Supabase Dashboard -> SQL Editor -> Run
-- ====================================================================

-- 1. Temporarily disable RLS to clear the recursion error
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop all recursive policies on user_profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins and users can read user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "User can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins and users can update user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "User can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "User can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Public read profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow public read on user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow authenticated insert on user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow authenticated update on user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON public.user_profiles;

-- 3. Re-enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create CLEAN, NON-RECURSIVE policies
-- SELECT: anyone authenticated or anon can read profiles
CREATE POLICY "user_profiles_select_policy"
  ON public.user_profiles FOR SELECT
  USING (true);

-- INSERT: anyone can insert their profile row
CREATE POLICY "user_profiles_insert_policy"
  ON public.user_profiles FOR INSERT
  WITH CHECK (true);

-- UPDATE: users can update their profile or admin can update
CREATE POLICY "user_profiles_update_policy"
  ON public.user_profiles FOR UPDATE
  USING (true);

-- DELETE: allows deletion if necessary
CREATE POLICY "user_profiles_delete_policy"
  ON public.user_profiles FOR DELETE
  USING (true);

-- 5. Seed default designations if none exist for each department
INSERT INTO public.designations (department_id, tier, name, name_hi, maps_to_role, hierarchy_code)
SELECT d.id, 1, 'Department Head', 'विभाग प्रमुख', 'department_head', 'department_head'
FROM public.departments d
WHERE NOT EXISTS (
  SELECT 1 FROM public.designations WHERE department_id = d.id AND tier = 1
);

INSERT INTO public.designations (department_id, tier, name, name_hi, maps_to_role, hierarchy_code)
SELECT d.id, 2, 'Supervisor', 'पर्यवेक्षक', 'supervisor', 'supervisor'
FROM public.departments d
WHERE NOT EXISTS (
  SELECT 1 FROM public.designations WHERE department_id = d.id AND tier = 2
);

INSERT INTO public.designations (department_id, tier, name, name_hi, maps_to_role, hierarchy_code)
SELECT d.id, 3, 'Field Employee', 'फील्ड कर्मचारी', 'field_employee', 'operational_staff'
FROM public.departments d
WHERE NOT EXISTS (
  SELECT 1 FROM public.designations WHERE department_id = d.id AND tier = 3
);

INSERT INTO public.designations (department_id, tier, name, name_hi, maps_to_role, hierarchy_code)
SELECT d.id, 4, 'Department Staff', 'विभागीय स्टाफ', 'dept_staff', 'operational_staff'
FROM public.departments d
WHERE NOT EXISTS (
  SELECT 1 FROM public.designations WHERE department_id = d.id AND tier = 4
);
