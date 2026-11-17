-- HangarNight and Hangar Marketplace share this Supabase project and the
-- push_tokens table. Without an app tag, a push meant for one app could
-- land in the other for anyone who has both installed. The Hangar
-- Marketplace app writes app = 'hangarmarketplace' from build 5 on, and
-- its senders only target those rows. Rows from before this change stay
-- null (unknown).
alter table public.push_tokens add column if not exists app text;
