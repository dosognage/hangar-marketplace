-- ── Organizations ────────────────────────────────────────────────────────
-- One organization per subscription holder.
-- Created automatically when a user first visits /team.

CREATE TABLE IF NOT EXISTS organizations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  owner_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Subscription tier drives seat_limit enforcement.
  -- Updated by Stripe webhook once billing is wired up.
  -- Manual override available via admin panel in the meantime.
  subscription_tier text NOT NULL DEFAULT 'starter'
    CHECK (subscription_tier IN ('starter','growth','professional','enterprise')),
  seat_limit       int  NOT NULL DEFAULT 1,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_owner_unique UNIQUE (owner_id)
);

-- ── Organization members ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organization_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- user_id is null until the invitation is accepted
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email   text NOT NULL,
  role            text NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner','member')),
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','removed')),
  invite_token    text UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_at      timestamptz NOT NULL DEFAULT now(),
  accepted_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- One row per email per org
  CONSTRAINT org_member_email_unique UNIQUE (org_id, invited_email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_members_org     ON organization_members (org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user    ON organization_members (user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_token   ON organization_members (invite_token);
CREATE INDEX IF NOT EXISTS idx_org_members_email   ON organization_members (invited_email);

-- Auto-update updated_at on organizations
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_organizations_updated_at();

-- RLS: service role only (all access goes through server actions / API routes)
ALTER TABLE organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Seat limits by tier (for reference — enforced in application code)
-- starter:      1 seat
-- growth:       3 seats
-- professional: 5 seats
-- enterprise:   unlimited (999)
