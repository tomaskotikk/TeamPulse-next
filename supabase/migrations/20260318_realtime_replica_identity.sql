begin;

-- Ensure UPDATE/DELETE events include enough data for robust realtime sync.
alter table public.chat_messages replica identity full;
alter table public.notifications replica identity full;

commit;
