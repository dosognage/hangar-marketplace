-- Broker alert radius preference and cached airport geocoordinates
--
-- alert_radius_miles: broker's chosen notification radius (0 = off)
-- specialty_airports_coords: cached lat/lng for each specialty airport
--   stored as JSONB e.g. {"KBFI": {"lat": 47.529, "lng": -122.302}, ...}
--   populated in background when broker saves their specialty airports

ALTER TABLE broker_profiles
  ADD COLUMN IF NOT EXISTS alert_radius_miles integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS specialty_airports_coords jsonb NOT NULL DEFAULT '{}';
