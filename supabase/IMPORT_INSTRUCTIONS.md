Supabase Full Import (Legacy TeamPulse)

1. Open Supabase project SQL Editor.
2. Open file: supabase/migrations/20260313_legacy_full_import.sql
3. Paste entire SQL and run it.

What it does:
- Drops and recreates all legacy public tables:
  users, clubs, chat_messages, password_resets, pending_registrations,
  sms_verifications, team_invitations, two_factor_codes
- Recreates indexes, constraints, and updated_at trigger for chat_messages
- Imports legacy data from your MySQL dump (including users and club)
- Resets identity sequences

Important:
- This is destructive for those tables (full overwrite).
- It does not migrate users into supabase auth.users.
  It migrates your custom users table with password_hash.
