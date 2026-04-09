-- Email subscribers table
-- Stores both guest subscribers (no account) and opted-in users.
-- Satisfies CAN-SPAM, GDPR, CASL, and PECR consent requirements.

CREATE TABLE IF NOT EXISTS email_subscribers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            text NOT NULL,
  -- Consent fields required for GDPR/CASL proof of consent
  marketing_consent      boolean NOT NULL DEFAULT false,
  consent_timestamp      timestamptz,
  consent_ip             text,          -- IP at time of consent (GDPR record-keeping)
  consent_source         text,          -- e.g. 'footer_form', 'checkout', 'signup'
  -- Unsubscribe
  unsubscribed_at        timestamptz,
  unsubscribe_token      text UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  -- Optional link to an auth user
  user_id                uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  -- One row per email
  CONSTRAINT email_subscribers_email_key UNIQUE (email)
);

-- Index for fast unsubscribe token lookups
CREATE INDEX IF NOT EXISTS idx_email_subscribers_token
  ON email_subscribers (unsubscribe_token);

-- Index for active subscriber queries (marketing sends)
CREATE INDEX IF NOT EXISTS idx_email_subscribers_active
  ON email_subscribers (marketing_consent, unsubscribed_at)
  WHERE marketing_consent = true AND unsubscribed_at IS NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_email_subscribers_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER email_subscribers_updated_at
  BEFORE UPDATE ON email_subscribers
  FOR EACH ROW EXECUTE FUNCTION update_email_subscribers_updated_at();

-- RLS: only service role can read/write (no direct client access)
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;
