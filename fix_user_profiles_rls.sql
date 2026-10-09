-- ====================================================================
-- AUTO-APPROVE STAFF & FIX USER_PROFILES RLS RECURSION
-- Run this complete script in Supabase Dashboard -> SQL Editor -> Run
-- ====================================================================

-- 1. Temporarily disable RLS to clear any active recursion locks
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

-- 3. Re-enable RLS with clean, non-recursive policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_select_policy"
  ON public.user_profiles FOR SELECT
  USING (true);

CREATE POLICY "user_profiles_insert_policy"
  ON public.user_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "user_profiles_update_policy"
  ON public.user_profiles FOR UPDATE
  USING (true);

CREATE POLICY "user_profiles_delete_policy"
  ON public.user_profiles FOR DELETE
  USING (true);

-- 4. Set default approval_status to 'approved'
ALTER TABLE public.user_profiles 
  ALTER COLUMN approval_status SET DEFAULT 'approved'::text;

-- 5. Auto-approve all existing users and convert any 'pending_staff' to active 'dept_staff'
UPDATE public.user_profiles
SET 
  approval_status = 'approved',
  approved_at = COALESCE(approved_at, now()),
  role = CASE WHEN role = 'pending_staff' THEN 'dept_staff' ELSE role END
WHERE approval_status IS DISTINCT FROM 'approved' OR role = 'pending_staff';

-- 6. Trigger: Automatically approve every staff user immediately on insert or update
CREATE OR REPLACE FUNCTION public.auto_approve_staff()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If role is pending_staff, promote to dept_staff
  IF NEW.role = 'pending_staff' THEN
    NEW.role := 'dept_staff';
  END IF;

  -- Always ensure approval_status is approved for staff and authority users
  IF NEW.role IN ('dept_staff', 'department_head', 'supervisor', 'field_employee', 'municipal_administrator', 'control_room', 'management_viewer', 'admin') THEN
    NEW.approval_status := 'approved';
    NEW.approved_at := COALESCE(NEW.approved_at, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_approve_staff ON public.user_profiles;
CREATE TRIGGER trg_auto_approve_staff
BEFORE INSERT OR UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_approve_staff();

-- 7. Seed standard department designations if not already present
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
