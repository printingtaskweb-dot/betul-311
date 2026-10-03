-- IMC 311 Portal Database Setup
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- DEPARTMENTS table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon text NOT NULL DEFAULT '🏢',
  color text NOT NULL DEFAULT '#6366f1',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- STATUS ENUM
CREATE TYPE complaint_status AS ENUM ('pending', 'in_progress', 'resolved', 'verified', 'rejected');

-- COMPLAINTS table
CREATE TABLE IF NOT EXISTS complaints (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number text UNIQUE,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  citizen_name text,
  citizen_phone text,
  description text NOT NULL,
  latitude float8,
  longitude float8,
  address text,
  photo_url text,
  status complaint_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'IMC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('ticket_seq')::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1;

CREATE TRIGGER set_ticket_number
BEFORE INSERT ON complaints
FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER complaints_updated_at
BEFORE UPDATE ON complaints
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RESOLUTIONS table
CREATE TABLE IF NOT EXISTS resolutions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id uuid REFERENCES complaints(id) ON DELETE CASCADE,
  admin_note text,
  resolution_photo_url text,
  resolved_by text NOT NULL,
  resolved_at timestamptz DEFAULT now()
);

-- VERIFICATIONS table
CREATE TYPE verifier_type AS ENUM ('citizen', 'admin');

CREATE TABLE IF NOT EXISTS verifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id uuid REFERENCES complaints(id) ON DELETE CASCADE,
  verified_by verifier_type NOT NULL,
  is_satisfied boolean NOT NULL,
  note text,
  verified_at timestamptz DEFAULT now()
);

-- SEED DEPARTMENTS
INSERT INTO departments (name, slug, description, icon, color) VALUES
  ('Green', 'green', 'Parks, gardens, trees and urban greenery', '🌿', '#22c55e'),
  ('Water', 'water', 'Water supply, pipelines and shortages', '💧', '#3b82f6'),
  ('Rain Water', 'rainwater', 'Drainage, flooding and stormwater issues', '🌧️', '#6366f1'),
  ('C&D Waste', 'cnd', 'Construction and demolition waste clearance', '🏗️', '#f59e0b'),
  ('Clean', 'clean', 'Street cleaning, garbage collection and sanitation', '🧹', '#10b981'),
  ('Roads', 'roads', 'Potholes, road damage and footpath issues', '🛣️', '#ef4444'),
  ('Streetlight', 'streetlight', 'Broken or missing streetlights', '💡', '#eab308'),
  ('Sewage', 'sewage', 'Sewage overflow, choked drains and manhole issues', '🚰', '#8b5cf6')
ON CONFLICT (slug) DO NOTHING;

-- ROW LEVEL SECURITY (Public read, public insert for complaints)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

-- Public can read departments
CREATE POLICY "Public read departments" ON departments FOR SELECT USING (true);

-- Public can insert complaints
CREATE POLICY "Public insert complaints" ON complaints FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read complaints" ON complaints FOR SELECT USING (true);
CREATE POLICY "Public update complaints" ON complaints FOR UPDATE USING (true);

-- Public can read resolutions and verifications
CREATE POLICY "Public read resolutions" ON resolutions FOR SELECT USING (true);
CREATE POLICY "Public insert resolutions" ON resolutions FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read verifications" ON verifications FOR SELECT USING (true);
CREATE POLICY "Public insert verifications" ON verifications FOR INSERT WITH CHECK (true);

-- STORAGE BUCKET for complaint photos
INSERT INTO storage.buckets (id, name, public) VALUES ('complaint-photos', 'complaint-photos', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Public upload photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'complaint-photos');

CREATE POLICY "Public read photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'complaint-photos');
