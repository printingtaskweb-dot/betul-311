-- ==============================================================================
-- MUNICIPALITY HIERARCHY & 12 DEPARTMENTS SCHEMA MIGRATION
-- ==============================================================================
-- Hierarchy Flow:
-- Municipality (Top)
--   → Municipal Commissioner / Organization Head
--     → Additional / Deputy Commissioner / Coordinator
--       → 12 Departments (each with 4 tier designations):
--           Tier 1: Department Head
--           Tier 2: Area / Zone / Ward Officer
--           Tier 3: Supervisor
--           Tier 4: Operational Staff
-- ==============================================================================

-- 1. Ensure UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Hierarchy Roles Table (Defines organizational ranks)
CREATE TABLE IF NOT EXISTS public.hierarchy_roles (
  code text NOT NULL PRIMARY KEY,
  name text NOT NULL,
  name_hi text,
  rank integer NOT NULL,
  parent_code text REFERENCES public.hierarchy_roles(code) ON DELETE SET NULL,
  scope_level text NOT NULL DEFAULT 'department',
  maps_to_role text NOT NULL DEFAULT 'dept_staff',
  can_approve boolean NOT NULL DEFAULT false,
  can_view_all boolean NOT NULL DEFAULT false,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed Hierarchy Roles
INSERT INTO public.hierarchy_roles (code, name, name_hi, rank, parent_code, scope_level, maps_to_role, can_approve, can_view_all, description)
VALUES
  ('municipal_commissioner', 'Municipal Commissioner / Organization Head', 'नगर पालिका आयुक्त / संगठन प्रमुख', 1, NULL, 'municipality', 'municipal_administrator', true, true, 'Apex Authority of the Municipality'),
  ('deputy_commissioner', 'Additional / Deputy Commissioner / Coordinator', 'अपर / उपायुक्त / समन्वयक', 2, 'municipal_commissioner', 'municipality', 'municipal_administrator', true, true, 'Coordinates municipal operations and departments'),
  ('department_head', 'Department Head', 'विभागीय प्रमुख', 3, 'deputy_commissioner', 'department', 'department_head', true, true, 'Heads a municipal department'),
  ('area_officer', 'Area / Zone / Ward Officer', 'क्षेत्रीय / जोनल / वार्ड अधिकारी', 4, 'department_head', 'zone', 'supervisor', true, false, 'Oversees zones, wards, and area operations'),
  ('supervisor', 'Supervisor', 'पर्यवेक्षक', 5, 'area_officer', 'ward', 'supervisor', false, false, 'Supervises field operations and teams'),
  ('operational_staff', 'Operational Staff / Crew', 'परिचालन कर्मचारी / फील्ड क्रू', 6, 'supervisor', 'ward', 'field_employee', false, false, 'Field operatives, technicians, and crew')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  name_hi = EXCLUDED.name_hi,
  rank = EXCLUDED.rank,
  parent_code = EXCLUDED.parent_code,
  scope_level = EXCLUDED.scope_level,
  maps_to_role = EXCLUDED.maps_to_role,
  can_approve = EXCLUDED.can_approve,
  can_view_all = EXCLUDED.can_view_all;

-- 3. Update User Profiles Role Constraint
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN (
  'citizen',
  'pending_staff',
  'dept_staff',
  'admin',
  'rejected_staff',
  'municipal_administrator',
  'department_head',
  'supervisor',
  'field_employee',
  'management_viewer',
  'control_room'
));

-- 4. Seed / Upsert the 12 Municipal Departments
INSERT INTO public.departments (name, slug, description, icon, color, is_active)
VALUES
  ('Sanitation & Solid Waste', 'sanitation', 'City cleanliness, waste collection, dump clearance, and sanitation crew management.', '🧹', '#660033', true),
  ('Water Supply & Sewerage', 'water', 'Drinking water pipelines, tube wells, water leakage repairs, drainage & sewerage.', '💧', '#1e3a8a', true),
  ('Roads & Civil Works', 'roads', 'Pothole repairs, road construction, footpaths, bridges, and civil infrastructure.', '🚧', '#b45309', true),
  ('Street Lighting & Electrical', 'electricity', 'Streetlights, electrical poles, dark spots, cables, and municipal power systems.', '💡', '#ca8a04', true),
  ('Parks & Public Spaces', 'parks', 'Public gardens, municipal parks, tree plantation, trimming, and beautification.', '🌳', '#15803d', true),
  ('Buildings & Encroachments', 'encroachment', 'Building permissions, illegal structures, anti-encroachment, and public safety.', '🏗️', '#c2410c', true),
  ('Revenue & Property Tax', 'revenue', 'Property tax assessments, shop licenses, municipal revenue, and tax collections.', '💰', '#047857', true),
  ('Accounts & Stores', 'accounts', 'Municipal finance, accounts ledger, procurement, inventory, and stores supply.', '📦', '#4338ca', true),
  ('Establishment & Administration', 'administration', 'Personnel management, civic establishment, records, public notices, and office administration.', '🏛️', '#4b5563', true),
  ('IT & Service Control Room', 'it_control_room', 'Citizen grievance control room, 311 helpline, CCTV, portal, and technical systems.', '🖥️', '#0284c7', true),
  ('Fleet & Workshop', 'fleet', 'Garbage compactors, water tankers, fire tenders, vehicle maintenance, and fuel logistics.', '🚛', '#d97706', true),
  ('Fire & Disaster Support', 'fire', 'Emergency fire rescue, hazardous incidents, disaster preparedness, and relief crew.', '🚒', '#b91c1c', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  is_active = true;

-- Ensure Green Waste department slug remains intact for existing green portal flows
INSERT INTO public.departments (name, slug, description, icon, color, is_active)
VALUES ('Green Waste & Pruning', 'green', 'Fallen tree branches, dry foliage, garden waste and pruning collection.', '🌿', '#15803d', true)
ON CONFLICT (slug) DO NOTHING;

-- 5. Seed Designations for Each of the 12 Departments (4 Tiers per Department)
DO $$
DECLARE
  dept_rec RECORD;
BEGIN
  -- Department 1: Sanitation & Solid Waste
  SELECT id INTO dept_rec FROM public.departments WHERE slug = 'sanitation';
  IF FOUND THEN
    INSERT INTO public.designations (department_id, tier, name, name_hi, maps_to_role, hierarchy_code, scope_description) VALUES
      (dept_rec.id, 1, 'Health / Sanitation Officer', 'स्वास्थ्य / स्वच्छता अधिकारी', 'department_head', 'department_head', 'Department head overseeing municipal sanitation and public health'),
      (dept_rec.id, 2, 'Zone / Ward Sanitary Inspector', 'जोन / वार्ड स्वच्छता निरीक्षक', 'supervisor', 'area_officer', 'Area officer in charge of sanitation inspections across designated zones/wards'),
      (dept_rec.id, 3, 'Sanitation Supervisor', 'स्वच्छता पर्यवेक्षक', 'supervisor', 'supervisor', 'Ground supervisor managing daily cleaning routes and attendance'),
      (dept_rec.id, 4, 'Sanitation Workers / Collection Crew', 'सफाई कर्मचारी / कचरा संग्रहण दल', 'field_employee', 'operational_staff', 'Field workers carrying out door-to-door collection and street sweeping')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Department 2: Water Supply & Sewerage
  SELECT id INTO dept_rec FROM public.departments WHERE slug = 'water';
  IF FOUND THEN
    INSERT INTO public.designations (department_id, tier, name, name_hi, maps_to_role, hierarchy_code, scope_description) VALUES
      (dept_rec.id, 1, 'Water / Sewerage Department Head', 'जल प्रदाय एवं सीवरेज विभाग प्रमुख', 'department_head', 'department_head', 'Chief engineer/head for city water supply and drainage networks'),
      (dept_rec.id, 2, 'Area Assistant / Junior Engineer', 'क्षेत्रीय सहायक / कनिष्ठ यंत्री', 'supervisor', 'area_officer', 'Zone engineer managing water distribution lines and pumping stations'),
      (dept_rec.id, 3, 'Pipeline / Pump Supervisor', 'पाइपलाइन / पंप पर्यवेक्षक', 'supervisor', 'supervisor', 'Supervises pipeline repairs, water supply timing, and valve operation'),
      (dept_rec.id, 4, 'Plumbers / Pump Operators / Sewer Crew', 'प्लंबर / पंप ऑपरेटर / सीवर टीम', 'field_employee', 'operational_staff', 'Operational technicians executing pipeline repairs and pump maintenance')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Department 3: Roads & Civil Works
  SELECT id INTO dept_rec FROM public.departments WHERE slug = 'roads';
  IF FOUND THEN
    INSERT INTO public.designations (department_id, tier, name, name_hi, maps_to_role, hierarchy_code, scope_description) VALUES
      (dept_rec.id, 1, 'Public Works / Engineering Head', 'लोक निर्माण / इंजीनियरिंग प्रमुख', 'department_head', 'department_head', 'Executive engineer managing municipal civil infrastructure and road construction'),
      (dept_rec.id, 2, 'Assistant / Junior Engineer', 'सहायक / कनिष्ठ यंत्री (सिविल)', 'supervisor', 'area_officer', 'Civil engineer responsible for ward road repairs and contractor inspections'),
      (dept_rec.id, 3, 'Site Supervisor', 'साइट पर्यवेक्षक', 'supervisor', 'supervisor', 'Supervises road resurfacing, pothole filling, and masonry work on-site'),
      (dept_rec.id, 4, 'Masons / Repair Crew / Contractor Team', 'मिस्त्री / मरम्मत दल / ठेकेदार टीम', 'field_employee', 'operational_staff', 'Field construction and repair workers')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Department 4: Street Lighting & Electrical
  SELECT id INTO dept_rec FROM public.departments WHERE slug = 'electricity';
  IF FOUND THEN
    INSERT INTO public.designations (department_id, tier, name, name_hi, maps_to_role, hierarchy_code, scope_description) VALUES
      (dept_rec.id, 1, 'Electrical Department Head', 'विद्युत विभाग प्रमुख', 'department_head', 'department_head', 'Department head overseeing public lighting and electrical installations'),
      (dept_rec.id, 2, 'Area Electrical Engineer', 'क्षेत्रीय विद्युत अभियंता', 'supervisor', 'area_officer', 'Zone engineer overseeing streetlight feeders and power transformers'),
      (dept_rec.id, 3, 'Electrical Supervisor', 'विद्युत पर्यवेक्षक', 'supervisor', 'supervisor', 'Ground supervisor allocating streetlight repair tickets to technicians'),
      (dept_rec.id, 4, 'Electricians / Lineworkers / Helpers', 'इलेक्ट्रीशियन / लाइनमैन / सहायक', 'field_employee', 'operational_staff', 'Technicians repairing faulty fixtures, timers, and cables')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Department 5: Parks & Public Spaces
  SELECT id INTO dept_rec FROM public.departments WHERE slug = 'parks';
  IF FOUND THEN
    INSERT INTO public.designations (department_id, tier, name, name_hi, maps_to_role, hierarchy_code, scope_description) VALUES
      (dept_rec.id, 1, 'Horticulture Department Head', 'उद्यान विभाग प्रमुख', 'department_head', 'department_head', 'Head of horticulture, urban greenery, and public gardens'),
      (dept_rec.id, 2, 'Area Horticulture Officer', 'क्षेत्रीय उद्यान अधिकारी', 'supervisor', 'area_officer', 'Inspects parks, green medians, and nursery developments in designated areas'),
      (dept_rec.id, 3, 'Park / Garden Supervisor', 'उद्यान पर्यवेक्षक', 'supervisor', 'supervisor', 'Supervises gardening schedules, watering, and equipment'),
      (dept_rec.id, 4, 'Gardeners / Maintenance Staff', 'माली / रख-रखाव कर्मचारी', 'field_employee', 'operational_staff', 'Field gardeners for lawn mowing, pruning, and plantation')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Department 6: Buildings & Encroachments
  SELECT id INTO dept_rec FROM public.departments WHERE slug = 'encroachment';
  IF FOUND THEN
    INSERT INTO public.designations (department_id, tier, name, name_hi, maps_to_role, hierarchy_code, scope_description) VALUES
      (dept_rec.id, 1, 'Building / Planning / Enforcement Head', 'भवन अनुज्ञा एवं अतिक्रमण विरोधी प्रमुख', 'department_head', 'department_head', 'Head of municipal town planning and encroachment removal'),
      (dept_rec.id, 2, 'Building Officer / Area Inspector', 'भवन अधिकारी / क्षेत्रीय निरीक्षक', 'supervisor', 'area_officer', 'Inspects site setbacks, construction compliance, and illegal occupations'),
      (dept_rec.id, 3, 'Inspection / Enforcement Supervisor', 'प्रवर्तन पर्यवेक्षक', 'supervisor', 'supervisor', 'Leads enforcement and demolition task forces'),
      (dept_rec.id, 4, 'Surveyors / Inspectors / Field Crew', 'सर्वेयर / फील्ड दल', 'field_employee', 'operational_staff', 'Field survey operatives and eviction crew')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Department 7: Revenue & Property Tax
  SELECT id INTO dept_rec FROM public.departments WHERE slug = 'revenue';
  IF FOUND THEN
    INSERT INTO public.designations (department_id, tier, name, name_hi, maps_to_role, hierarchy_code, scope_description) VALUES
      (dept_rec.id, 1, 'Revenue Officer', 'राजस्व अधिकारी', 'department_head', 'department_head', 'Head of municipal taxes, assessments, and trade licenses'),
      (dept_rec.id, 2, 'Area Revenue Inspector', 'क्षेत्रीय राजस्व निरीक्षक (RI)', 'supervisor', 'area_officer', 'Oversees ward property tax assessments and challans'),
      (dept_rec.id, 3, 'Tax / Collection Supervisor', 'कर / वसूली पर्यवेक्षक', 'supervisor', 'supervisor', 'Monitors daily collection targets and billing assistants'),
      (dept_rec.id, 4, 'Tax Assistants / Billing / Collection Staff', 'कर सहायक / बिलिंग व वसूली स्टाफ', 'field_employee', 'operational_staff', 'Distributes property tax notices and collects payments')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Department 8: Accounts & Stores
  SELECT id INTO dept_rec FROM public.departments WHERE slug = 'accounts';
  IF FOUND THEN
    INSERT INTO public.designations (department_id, tier, name, name_hi, maps_to_role, hierarchy_code, scope_description) VALUES
      (dept_rec.id, 1, 'Finance / Accounts Head', 'वित्त एवं लेखा प्रमुख', 'department_head', 'department_head', 'Chief accounts officer managing budgets, audits, and municipal funds'),
      (dept_rec.id, 2, 'Accounts Officer / Stores In-charge', 'लेखा अधिकारी / स्टोर प्रभारी', 'supervisor', 'area_officer', 'Supervises municipal treasury, bills passing, and inventory storage'),
      (dept_rec.id, 3, 'Accountant / Storekeeper', 'लेखाकार / स्टोरकीपर', 'supervisor', 'supervisor', 'Maintains inventory registers, stock issuance, and ledger vouchers'),
      (dept_rec.id, 4, 'Accounts Assistants / Inventory Staff', 'लेखा सहायक / इन्वेंटरी स्टाफ', 'field_employee', 'operational_staff', 'Handles voucher entries, data verification, and physical stores')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Department 9: Establishment & Administration
  SELECT id INTO dept_rec FROM public.departments WHERE slug = 'administration';
  IF FOUND THEN
    INSERT INTO public.designations (department_id, tier, name, name_hi, maps_to_role, hierarchy_code, scope_description) VALUES
      (dept_rec.id, 1, 'Administration / Establishment Head', 'सामान्य प्रशासन / स्थापना प्रमुख', 'department_head', 'department_head', 'Head of municipal administration and human resources'),
      (dept_rec.id, 2, 'Establishment / Personnel Officer', 'स्थापना / कार्मिक अधिकारी', 'supervisor', 'area_officer', 'Oversees employee records, transfers, service books, and postings'),
      (dept_rec.id, 3, 'Office / Staff Coordinator', 'कार्यालय / स्टाफ समन्वयक', 'supervisor', 'supervisor', 'Supervises general office administration and inter-departmental communications'),
      (dept_rec.id, 4, 'Clerks / Records / Support Staff', 'लिपिक / रिकॉर्ड / सहायक कर्मचारी', 'field_employee', 'operational_staff', 'Office clerks, record keepers, and dispatch assistants')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Department 10: IT & Service Control Room
  SELECT id INTO dept_rec FROM public.departments WHERE slug = 'it_control_room';
  IF FOUND THEN
    INSERT INTO public.designations (department_id, tier, name, name_hi, maps_to_role, hierarchy_code, scope_description) VALUES
      (dept_rec.id, 1, 'IT / Citizen Services Head', 'सूचना प्रौद्योगिकी / नागरिक सेवा प्रमुख', 'department_head', 'department_head', 'Head of digital systems, 311 portal, and citizen call centers'),
      (dept_rec.id, 2, 'System / Control Room In-charge', 'सिस्टम / कंट्रोल रूम प्रभारी', 'supervisor', 'area_officer', 'Manages 24x7 control room shifts, GIS feeds, and server operations'),
      (dept_rec.id, 3, 'Shift Supervisor', 'शिफ्ट पर्यवेक्षक', 'supervisor', 'supervisor', 'Supervises live ticket assignments and SLA breach notifications'),
      (dept_rec.id, 4, 'Call Operators / Ticket / Data Staff', 'कॉल ऑपरेटर / टिकट प्रबंधन स्टाफ', 'field_employee', 'operational_staff', 'Operators answering citizen helpline calls and logging grievances')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Department 11: Fleet & Workshop
  SELECT id INTO dept_rec FROM public.departments WHERE slug = 'fleet';
  IF FOUND THEN
    INSERT INTO public.designations (department_id, tier, name, name_hi, maps_to_role, hierarchy_code, scope_description) VALUES
      (dept_rec.id, 1, 'Fleet / Transport Department Head', 'परिवहन एवं वर्कशॉप विभाग प्रमुख', 'department_head', 'department_head', 'Head of municipal fleet, vehicles, machinery, and fuel management'),
      (dept_rec.id, 2, 'Fleet / Workshop In-charge', 'फ्लीट / वर्कशॉप प्रभारी', 'supervisor', 'area_officer', 'Oversees vehicle fitness, scheduled repairs, and equipment dispatch'),
      (dept_rec.id, 3, 'Route / Vehicle Supervisor', 'रूट / वाहन पर्यवेक्षक', 'supervisor', 'supervisor', 'Monitors GPS route adherence of garbage trucks and water tankers'),
      (dept_rec.id, 4, 'Drivers / Mechanics / Vehicle Assistants', 'चालक / मैकेनिक / वाहन सहायक', 'field_employee', 'operational_staff', 'Vehicle drivers, mechanics, and maintenance crew')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Department 12: Fire & Disaster Support
  SELECT id INTO dept_rec FROM public.departments WHERE slug = 'fire';
  IF FOUND THEN
    INSERT INTO public.designations (department_id, tier, name, name_hi, maps_to_role, hierarchy_code, scope_description) VALUES
      (dept_rec.id, 1, 'Fire Services Head', 'अग्निशमन सेवा प्रमुख', 'department_head', 'department_head', 'Chief fire officer leading emergency response and disaster mitigation'),
      (dept_rec.id, 2, 'Station / Shift In-charge', 'स्टेशन / शिफ्ट प्रभारी', 'supervisor', 'area_officer', 'Command officer at the fire station handling emergency turnouts'),
      (dept_rec.id, 3, 'Crew Leader / Lead Firefighter', 'दल नायक / लीड फायर फाइटर', 'supervisor', 'supervisor', 'Supervises on-site rescue, hose line deployment, and life-saving teams'),
      (dept_rec.id, 4, 'Firefighters / Drivers / Crew', 'अग्निशामक / चालक / रेस्क्यू क्रू', 'field_employee', 'operational_staff', 'Frontline firefighters, ladder operators, and emergency drivers')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 6. RPC Function to query designations for a department in strict tier order
CREATE OR REPLACE FUNCTION public.list_chain_for_dept(p_dept_id uuid)
RETURNS TABLE (
  designation_id uuid,
  tier integer,
  name text,
  name_hi text,
  hierarchy_code text,
  maps_to_role text,
  scope_description text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    d.id AS designation_id,
    d.tier,
    d.name,
    d.name_hi,
    d.hierarchy_code,
    d.maps_to_role,
    d.scope_description
  FROM public.designations d
  WHERE d.department_id = p_dept_id AND d.is_active = true
  ORDER BY d.tier ASC;
$$;

-- 7. View for Municipal Leadership Structure
CREATE OR REPLACE VIEW public.municipal_hierarchy_view AS
SELECT 
  u.id AS user_id,
  u.full_name,
  u.phone,
  u.email,
  u.staff_code,
  u.role,
  u.hierarchy_code,
  hr.name AS hierarchy_title,
  hr.rank AS hierarchy_rank,
  d.name AS department_name,
  d.icon AS department_icon,
  des.tier AS designation_tier,
  des.name AS designation_name,
  s.full_name AS reporting_officer_name,
  s.staff_code AS reporting_officer_code
FROM public.user_profiles u
LEFT JOIN public.hierarchy_roles hr ON hr.code = u.hierarchy_code
LEFT JOIN public.departments d ON d.id = u.linked_department_id
LEFT JOIN public.designations des ON des.id = u.designation_id
LEFT JOIN public.user_profiles s ON s.id = u.supervisor_id
WHERE u.role <> 'citizen';
