-- Leasehold remaining term.
--
-- When a hangar sits on a leasehold (the owner owns the hangar but leases the
-- underlying land), buyers care a lot about how many years are left on the
-- ground lease. A 3-year remaining lease is a very different purchase than a
-- 55-year one. This column is populated only when ownership_type = 'leasehold';
-- null otherwise.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS leasehold_years_remaining numeric;
