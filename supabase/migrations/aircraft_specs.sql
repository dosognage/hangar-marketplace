-- Aircraft Fit feature
--
-- Pilots want to know "will my aircraft fit in this hangar?" before they
-- click. We store published spec dimensions for the most common 150 general
-- aviation aircraft and compare them against each listing's door_width,
-- door_height, and hangar_depth at search time.
--
-- The aircraft_specs table is small (~150 rows) and rarely changes. Treat it
-- as reference data — seed once, edit only when manufacturers release new
-- airframes. Common-name uniqueness lets clients deep-link by slug later.

CREATE TABLE IF NOT EXISTS aircraft_specs (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer    text         NOT NULL,
  model           text         NOT NULL,
  -- Display label, e.g. "Piper PA-18 Super Cub". Unique so we can dedupe.
  common_name     text         NOT NULL UNIQUE,
  -- Loose grouping: light_single | mid_single | hp_single | light_twin |
  -- turboprop | light_jet | mid_jet | large_jet | helicopter
  category        text         NOT NULL,
  -- Published nominal dimensions in feet. Some aircraft vary by config;
  -- pilots with mods should treat these as a starting point.
  wingspan_ft     numeric      NOT NULL,
  length_ft       numeric      NOT NULL,
  height_ft       numeric      NOT NULL,
  -- Optional weight; helps filter against weight-rated hangar floors later.
  mtow_lbs        numeric,
  is_taildragger  boolean      NOT NULL DEFAULT false,
  created_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS aircraft_specs_manufacturer_idx ON aircraft_specs (manufacturer);
CREATE INDEX IF NOT EXISTS aircraft_specs_category_idx     ON aircraft_specs (category);

-- Read-only for everyone (it's reference data). RLS off keeps this simple.
ALTER TABLE aircraft_specs DISABLE ROW LEVEL SECURITY;

-- Each user can pick a default aircraft so the fit pill on the homepage and
-- the listing-detail widget pre-fill with their plane.
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS default_aircraft_id uuid REFERENCES aircraft_specs(id) ON DELETE SET NULL;
