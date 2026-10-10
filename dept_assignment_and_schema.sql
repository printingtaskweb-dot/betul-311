-- ============================================================
-- IMC 311 Portal: Department Work Allotment & Schema Enhancements
-- Run this script in the Supabase SQL Editor
-- ============================================================

-- 1. Add Task Assignment columns to public.complaints
ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.user_profiles(id),
ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES public.user_profiles(id),
ADD COLUMN IF NOT EXISTS assigned_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS assignment_notes text;

-- Index for speedy queries by assigned officer
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_to ON public.complaints(assigned_to);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_by ON public.complaints(assigned_by);

-- 2. Allow authenticated staff and admins to update assignments on complaints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'complaints' 
      AND policyname = 'Staff and admins can update complaint assignments'
  ) THEN
    CREATE POLICY "Staff and admins can update complaint assignments"
    ON public.complaints
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- 3. Ensure departments table allows custom department creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'departments' 
      AND policyname = 'Authenticated staff can insert departments'
  ) THEN
    CREATE POLICY "Authenticated staff can insert departments"
    ON public.departments
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END $$;

-- 4. Recreate View for Department Complaints (DROP first to prevent Postgres column rename error 42P16)
DROP VIEW IF EXISTS public.dept_complaints CASCADE;

CREATE VIEW public.dept_complaints AS
SELECT
    c.id,
    c.ticket_number,
    c.department_id,
    d.name AS dept_name,
    d.slug AS dept_slug,
    d.color AS dept_color,
    d.icon AS dept_icon,
    c.citizen_name,
    c.citizen_phone,
    c.description,
    c.latitude,
    c.longitude,
    c.address,
    c.photo_url,
    c.status,
    c.created_at,
    c.updated_at,
    c.assigned_to,
    c.assigned_by,
    c.assigned_at,
    c.assignment_notes,
    assignee.full_name AS assigned_name,
    assignee.phone AS assigned_phone,
    assignee.role AS assigned_role,
    assignee.staff_code AS assigned_code,
    r.admin_note AS resolution_note,
    r.resolution_photo_url AS resolution_photo,
    r.resolved_by,
    r.resolved_at,
    v.is_satisfied AS citizen_satisfied,
    v.verified_at AS citizen_verified_at
FROM public.complaints c
LEFT JOIN public.departments d ON c.department_id = d.id
LEFT JOIN public.user_profiles assignee ON c.assigned_to = assignee.id
LEFT JOIN public.resolutions r ON c.id = r.complaint_id
LEFT JOIN public.verifications v ON c.id = v.complaint_id;
