-- Add to existing Supabase setup (run in SQL Editor)

-- User profiles table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  language text DEFAULT 'en' CHECK (language IN ('en', 'hi')),
  ward_number text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User can read own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "User can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "User can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- Add created_by to complaints (optional FK to auth users)
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- View for complaint stats per department
CREATE OR REPLACE VIEW complaint_stats AS
SELECT
  d.id as department_id,
  d.name as department_name,
  d.slug,
  d.icon,
  d.color,
  COUNT(c.id) as total,
  COUNT(CASE WHEN c.status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN c.status = 'in_progress' THEN 1 END) as in_progress,
  COUNT(CASE WHEN c.status = 'resolved' THEN 1 END) as resolved,
  COUNT(CASE WHEN c.status = 'verified' THEN 1 END) as verified
FROM departments d
LEFT JOIN complaints c ON c.department_id = d.id
GROUP BY d.id, d.name, d.slug, d.icon, d.color;

-- Global stats view
CREATE OR REPLACE VIEW global_stats AS
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
  COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
  COUNT(CASE WHEN status = 'verified' THEN 1 END) as verified
FROM complaints;
