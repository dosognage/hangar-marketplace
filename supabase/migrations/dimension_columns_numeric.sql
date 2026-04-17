-- Change hangar dimension columns from integer to numeric so they can store
-- decimal feet (e.g. 14.667 for 14 ft 8 in).  Existing whole-number values
-- are preserved exactly.
ALTER TABLE listings
  ALTER COLUMN door_width   TYPE numeric USING door_width::numeric,
  ALTER COLUMN door_height  TYPE numeric USING door_height::numeric,
  ALTER COLUMN hangar_depth TYPE numeric USING hangar_depth::numeric;
