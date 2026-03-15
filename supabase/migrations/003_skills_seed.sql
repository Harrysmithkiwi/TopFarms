-- ============================================================
-- 003_skills_seed.sql
-- TopFarms — Skills reference data (~40 skills)
-- Based on DairyNZ competencies + standard NZ farm skills
-- ============================================================

INSERT INTO public.skills (name, category, sector) VALUES

  -- ============================================================
  -- DAIRY — Milking Operations
  -- ============================================================
  ('Rotary milking', 'milking', 'dairy'),
  ('Herringbone milking', 'milking', 'dairy'),
  ('AMS/robotic milking', 'milking', 'dairy'),
  ('Swing-over milking', 'milking', 'dairy'),
  ('Milk quality and hygiene', 'milking', 'dairy'),
  ('Teat scoring and mastitis detection', 'milking', 'dairy'),
  ('Cluster attachment and post-dip', 'milking', 'dairy'),

  -- ============================================================
  -- DAIRY — Livestock Management
  -- ============================================================
  ('Herd health monitoring', 'livestock', 'dairy'),
  ('Calving assistance', 'livestock', 'dairy'),
  ('AI (artificial insemination)', 'livestock', 'dairy'),
  ('Body condition scoring', 'livestock', 'dairy'),
  ('Calf rearing', 'livestock', 'dairy'),
  ('Feeding systems management', 'livestock', 'dairy'),

  -- ============================================================
  -- DAIRY — Qualifications
  -- ============================================================
  ('DairyNZ Level 1', 'qualification', 'dairy'),
  ('DairyNZ Level 2', 'qualification', 'dairy'),
  ('DairyNZ Level 3', 'qualification', 'dairy'),
  ('DairyNZ Level 4', 'qualification', 'dairy'),
  ('DairyNZ Level 5', 'qualification', 'dairy'),

  -- ============================================================
  -- SHEEP & BEEF — Core Skills
  -- ============================================================
  ('Lamb marking and docking', 'livestock', 'sheep_beef'),
  ('Shearing (operator)', 'shearing', 'sheep_beef'),
  ('Shearing (shed hand)', 'shearing', 'sheep_beef'),
  ('Mustering (on foot)', 'mustering', 'sheep_beef'),
  ('Mustering (motorbike)', 'mustering', 'sheep_beef'),
  ('Mustering (helicopter coordination)', 'mustering', 'sheep_beef'),
  ('Stock handling and yards', 'livestock', 'sheep_beef'),
  ('Drench and vaccination', 'livestock', 'sheep_beef'),
  ('Condition scoring and drafting', 'livestock', 'sheep_beef'),

  -- ============================================================
  -- MACHINERY — Both Sectors
  -- ============================================================
  ('Tractor operation (general)', 'machinery', 'both'),
  ('Tractor (loader)', 'machinery', 'both'),
  ('ATV/quad bike', 'machinery', 'both'),
  ('Motorbike (farm)', 'machinery', 'both'),
  ('Fencing (post and wire)', 'infrastructure', 'both'),
  ('Fencing (electric)', 'infrastructure', 'both'),
  ('Irrigation systems', 'infrastructure', 'both'),
  ('Effluent system management', 'infrastructure', 'both'),

  -- ============================================================
  -- MANAGEMENT — Both Sectors
  -- ============================================================
  ('Staff supervision', 'management', 'both'),
  ('Feed budgeting', 'management', 'both'),
  ('Farm financial basics', 'management', 'both'),
  ('Health and safety compliance', 'management', 'both'),
  ('Environmental compliance', 'management', 'both');
