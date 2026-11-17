-- Report and block for Hangar Marketplace messaging (App Store guideline 1.2).
--
-- blocked_users and is_blocked_pair() already exist (HangarNight added them
-- in August for hn_conversations / hn_messages). These triggers apply the
-- same rule to the marketplace's own conversations and messages tables, so
-- a block holds no matter which client writes: the website routes, the
-- app's messaging edge function, or anything added later.

create or replace function public.reject_blocked_marketplace_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  buyer       uuid;
  broker_user uuid;
  other_party uuid;
begin
  select c.buyer_id, bp.user_id
    into buyer, broker_user
    from public.conversations c
    left join public.broker_profiles bp on bp.id = c.broker_profile_id
   where c.id = new.conversation_id;

  other_party := case when new.sender_id = buyer then broker_user else buyer end;

  if other_party is not null and public.is_blocked_pair(new.sender_id, other_party) then
    raise exception 'This conversation is no longer available.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_reject_blocked on public.messages;
create trigger messages_reject_blocked
  before insert on public.messages
  for each row execute function public.reject_blocked_marketplace_message();

create or replace function public.reject_blocked_marketplace_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  broker_user uuid;
begin
  select user_id into broker_user from public.broker_profiles where id = new.broker_profile_id;
  if broker_user is not null and public.is_blocked_pair(new.buyer_id, broker_user) then
    raise exception 'This broker is not accepting messages.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists conversations_reject_blocked on public.conversations;
create trigger conversations_reject_blocked
  before insert on public.conversations
  for each row execute function public.reject_blocked_marketplace_conversation();
