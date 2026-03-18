begin;

alter table public.notifications
  add column if not exists chat_message_id bigint references public.chat_messages(id) on delete cascade;

create index if not exists idx_notifications_chat_message_id on public.notifications(chat_message_id);

commit;
