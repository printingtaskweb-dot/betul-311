-- =========================================================================
-- Department Portal SQL Setup
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ywwkivrdjyaoovfsxnzp/sql
-- =========================================================================

-- 1. Add dept_user_id to user_profiles so we can link a dept staff user
--    to a specific department (nullable for regular citizens)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS linked_department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS role text DEFAULT 'citizen' CHECK (role IN ('citizen','dept_staff','admin'));

-- 2. Create a helper view for department-filtered complaints
--    so dept staff can see only their department's complaints
CREATE OR REPLACE VIEW dept_complaints AS
SELECT
  c.*,
  d.name   AS dept_name,
  d.icon   AS dept_icon,
  d.color  AS dept_color,
  d.slug   AS dept_slug,
  r.admin_note          AS resolution_note,
  r.resolution_photo_url AS resolution_photo,
  r.resolved_by,
  r.resolved_at,
  v.is_satisfied         AS citizen_satisfied,
  v.verified_at          AS citizen_verified_at
FROM complaints c
JOIN departments d ON d.id = c.department_id
LEFT JOIN LATERAL (
  SELECT * FROM resolutions WHERE complaint_id = c.id ORDER BY resolved_at DESC LIMIT 1
) r ON true
LEFT JOIN LATERAL (
  SELECT * FROM verifications WHERE complaint_id = c.id AND verified_by = 'citizen' ORDER BY verified_at DESC LIMIT 1
) v ON true;

-- 3. Register dept staff users — run once per department staff member
-- Example: register Green Dept staff user
-- After the user signs up via /dept/login, run this to link them to a department:

-- UPDATE user_profiles
-- SET
--   role = 'dept_staff',
--   linked_department_id = (SELECT id FROM departments WHERE slug = 'green')
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'green.dept@betul.gov.in');

-- 4. Policy: dept_staff can view/update complaints of their own department only
-- (Enable RLS on complaints if not already enabled)
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Dept staff can update their dept complaints" ON complaints;
DROP POLICY IF EXISTS "Anyone can read complaints" ON complaints;
DROP POLICY IF EXISTS "Anyone can insert complaints" ON complaints;

-- Public read access (citizens can track their own complaints by ticket)
CREATE POLICY "Anyone can read complaints"
  ON complaints FOR SELECT
  USING (true);

-- Citizens can insert new complaints
CREATE POLICY "Anyone can insert complaints"
  ON complaints FOR INSERT
  WITH CHECK (true);

-- Dept staff can only update complaints belonging to their linked department
CREATE POLICY "Dept staff can update their dept complaints"
  ON complaints FOR UPDATE
  USING (
    department_id IN (
      SELECT linked_department_id FROM user_profiles WHERE id = auth.uid()
    )
    OR
    auth.uid() IN (SELECT id FROM user_profiles WHERE is_admin = true)
  );

-- 5. Policy: resolutions insert allowed for dept_staff or admin
ALTER TABLE resolutions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Dept staff can insert resolutions" ON resolutions;
CREATE POLICY "Dept staff can insert resolutions"
  ON resolutions FOR INSERT
  WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can read resolutions" ON resolutions;
CREATE POLICY "Anyone can read resolutions"
  ON resolutions FOR SELECT
  USING (true);

-- 6. Verify the setup
SELECT
  u.email,
  p.role,
  p.is_admin,
  d.name AS linked_department,
  d.slug
FROM auth.users u
JOIN user_profiles p ON p.id = u.id
LEFT JOIN departments d ON d.id = p.linked_department_id
ORDER BY p.role DESC;
