# Player onboarding + parent accounts — design

Date: 2026-10-10
Status: approved (brainstorming with user)
Scope: sub-project A. UI redesign (sub-project B) is a separate spec.

## Goal

When a manager invites a player, the player fills in a full registration form. Minors (<18) must provide a parent's e-mail; the manager verifies it, the parent registers, and only then are both accounts activated. Parents get a view of their children (events, profile, payments placeholder).

## Decisions

- Parent required only when player is under 18 at application submit time.
- Fields limited to what the club needs for safety/contact (no birth number, no sport data, no gender/citizenship).
- Existing parent (same e-mail, role `rodič`, same club) → child auto-linked on manager approval, parent gets an info e-mail.
- Parent scope now: child switcher, child's upcoming events, child profile, edit child's contact/health data, club chat, empty "Platby" section. Payments and attendance are future projects.
- Architecture: staging table `player_applications`; `users` rows are created only at activation. Existing queries over `users.organization` stay untouched.
- New flow only for role `hráč`. Invites for `trenér` / `rodič` unchanged.

## Fields

| Group | Field | Required |
|---|---|---|
| Personal | first_name, last_name, date_birth | yes |
| Personal | phone | yes if 18+ |
| Account | password (min 8) | yes |
| Address | street, city, zip | yes |
| Health | health_insurance | yes |
| Health | health_notes (allergies, conditions, medication) | no |
| Emergency (18+) | emergency_name, emergency_phone | yes |
| Parent (<18) | parent_first_name, parent_last_name, parent_email, parent_phone | yes |
| Consents | consent_gdpr | yes |
| Consents | consent_photos | no |

## Data model (additive migration only)

`supabase/migrations/20261010_player_onboarding.sql`, `create table if not exists`, no changes to existing tables.

- `player_applications` — id, club_id, invitation_id, email, password_hash, personal/address/health/emergency/parent fields, consent_gdpr, consent_photos, status (`pending_manager` | `pending_parent` | `completed` | `rejected`), rejection_reason, reviewed_by, reviewed_at, player_user_id, created_at, updated_at.
- `parent_invitations` — id, token unique, application_id, email, expires_at (7 days), used, created_at.
- `member_profiles` — user_id PK → users, street, city, zip, health_insurance, health_notes, emergency_name, emergency_phone, consent_gdpr_at, consent_photos, updated_at.
- `parent_children` — parent_user_id, child_user_id, club_id, created_at; PK (parent_user_id, child_user_id).

The user runs the migration manually in the Supabase SQL Editor.

## Flow

### Player (`/invite/accept?token=…`, role hráč)
1. 3-step form: (1) personal + password, (2) address + health, (3) parent (<18) or emergency contact (18+) + consents. Step 3 switches automatically by date of birth.
2. Submit → validate, check e-mail not in `users` nor in an open application → insert `player_applications` (`pending_manager`), mark invitation used, notify manager (in-app `player_application` + e-mail).
3. Confirmation screen "Přihláška odeslána, čeká na schválení".
4. Login while pending → message "Váš účet čeká na schválení" instead of wrong-password.
5. Player invitation expiry raised from 1 h to 7 days.

### Manager
- Dashboard block "Čekající přihlášky (N)" + sidebar item "Přihlášky" with count → `/applications`, detail `/applications/[id]`.
- Detail shows all data; parent e-mail is highlighted and editable.
- Approve:
  - 18+ → create `users` (role hráč, organization = club name) + `member_profiles`, resync categories, status `completed`, e-mail player "účet aktivní".
  - <18, parent e-mail exists as `rodič` in same club → create player + profile + `parent_children`, resync, `completed`, e-mail player + info e-mail parent.
  - <18, parent e-mail exists with other role or other club → approval blocked with warning; manager must correct the e-mail.
  - <18, new parent → status `pending_parent`, create `parent_invitations`, e-mail parent registration link. If e-mail fails, status stays `pending_manager` and the error is shown.
- Reject with reason → status `rejected`, e-mail player.
- "Znovu poslat e-mail rodiči" for `pending_parent` (invalidates previous invitation, creates new one).

### Parent (`/parent/register?token=…`)
1. Prefilled name/e-mail/phone from application; parent sets password (and may fix phone).
2. Submit → create parent `users` (role rodič, organization = club name), player `users` + `member_profiles`, `parent_children`, resync categories, status `completed`, e-mails to both, notification to manager.
3. If the parent e-mail already exists by then (registered another way) and is `rodič` in same club → link instead of creating.
4. No DB transactions in supabase-js → compensating deletes on failure in reverse order.

### Parent UI
- Child switcher (when >1 child), selected child stored in cookie.
- Parent dashboard: child's upcoming events (via child's categories / participants), child profile card, "Platby" empty state.
- Edit child's `member_profiles` (contact, address, health).
- Chat as today.

## Security

- Tokens random, single-use (atomic `used` update), 7-day expiry.
- bcrypt cost 12; password min 8.
- Health data visible only to club manager, club coaches, the player, and linked parents. Enforced server-side in every route.
- Parent routes verify `parent_children` link on every request.
- Approve/reject only by the club owner (`club.owner_user_id`).

## Errors

- Expired/used token → clear message + "kontaktujte manažera klubu".
- Parent e-mail send failure → stays `pending_manager`, retry possible.
- Age is evaluated at submit time only.

## Verification

No test framework (not adding one). `npm run build`, `npm run lint`, manual checklist:
1. Adult player: invite → form → manager approve → login works.
2. Minor + new parent: invite → form → approve → parent registers → both log in; parent sees child.
3. Minor + existing parent (sibling): approve → child linked, parent sees both children.
4. Reject → player gets e-mail, cannot log in.
5. Manager corrects parent e-mail → e-mail goes to corrected address.
6. Expired / reused tokens rejected.
7. Parent cannot access a non-linked child's data (API returns 403).
8. Pending applicant is not listed in members, categories, events, charts.
