-- Enable Realtime for chat_messages so the browser client can subscribe
alter publication supabase_realtime add table public.chat_messages;
