# Player Onboarding + Parent Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Invited players submit a full application; minors need a manager-verified parent who registers; both accounts activate together and the parent gets a child view.

**Architecture:** Staging table `player_applications` holds the application until activation, so existing `users.organization`-based queries never see pending players. Pure validation lives in `src/lib/onboarding/validation.ts`; account creation with compensating deletes lives in `src/lib/onboarding/activation.ts`. API routes follow the existing pattern (admin Supabase client + `getCurrentAppUser` checks).

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (supabase-js admin client), bcryptjs, Resend e-mail.

Spec: `docs/superpowers/specs/2026-10-10-player-onboarding-design.md`

**Testing note:** project has no test framework; spec decided not to add one. Each task verifies with `npx tsc --noEmit` + `npm run lint`; end-to-end verified with the manual checklist in Task 12.

---

## File map

| File | Responsibility |
|---|---|
| `supabase/migrations/20261010_player_onboarding.sql` | new tables (additive) |
| `src/lib/onboarding/validation.ts` | pure: parse + validate application payload, `isMinor` |
| `src/lib/onboarding/activation.ts` | create player/parent users, profiles, links; compensation |
| `src/lib/onboarding/applications.ts` | data access for applications (list, get, count, manager guard) |
| `src/lib/parent.ts` | parent ↔ child access helpers, selected child cookie |
| `src/lib/email/templates.ts` | + 5 templates |
| `src/lib/email/config.ts` | + `getParentRegisterUrl` |
| `src/app/api/invite/send/route.ts` | expiry 7 days, block e-mails with open application |
| `src/app/api/invite/accept/route.ts` | role hráč → create application instead of user |
| `src/app/api/auth/login/route.ts` | pending application message |
| `src/app/api/applications/route.ts` | GET list / count (manager) |
| `src/app/api/applications/[id]/route.ts` | GET detail, PATCH parent e-mail |
| `src/app/api/applications/[id]/approve/route.ts` | approve |
| `src/app/api/applications/[id]/reject/route.ts` | reject |
| `src/app/api/applications/[id]/resend-parent/route.ts` | new parent invitation |
| `src/app/api/parent/register/route.ts` | GET token info, POST register + activate |
| `src/app/api/parent/select-child/route.ts` | POST set selected child cookie |
| `src/app/api/members/[id]/profile/route.ts` | GET/PATCH `member_profiles` (self, linked parent, manager) |
| `src/app/invite/accept/page.tsx` + `PlayerApplicationForm.tsx` | 3-step form |
| `src/app/parent/register/page.tsx` | parent registration |
| `src/app/(dashboard)/applications/page.tsx`, `[id]/page.tsx`, `ApplicationActions.tsx` | manager review |
| `src/components/dashboard/PendingApplicationsCard.tsx` | dashboard block |
| `src/components/parent/ParentOverview.tsx`, `ChildSwitcher.tsx`, `ChildProfileForm.tsx` | parent UI |
| `src/components/Sidebar.tsx` | "Přihlášky" link + count |
| `src/app/(dashboard)/dashboard/page.tsx` | render pending card (manager) / parent overview (rodič) |
| `src/app/(dashboard)/members/[id]/page.tsx` | show profile/health + parents to manager/coach |

---

### Task 1: Migration

**Files:** Create `supabase/migrations/20261010_player_onboarding.sql`

- [ ] Write SQL: four tables per spec, `create table if not exists`, FKs with `on delete cascade` (applications → clubs; profiles/links → users), `check` on status, indexes on `(club_id, status)`, `lower(email)`, `lower(parent_email)`, `parent_invitations(token)`, `parent_children(child_user_id)`. Wrapped in `begin; … commit;`.
- [ ] User runs it in Supabase SQL Editor (manual step, blocking for Tasks 4+ at runtime, not compile time).
- [ ] Commit.

### Task 2: Validation module

**Files:** Create `src/lib/onboarding/validation.ts`

- [ ] Export `isMinor(dateBirth: string, now = new Date()): boolean` (age < 18, birthday-aware).
- [ ] Export `type ApplicationInput` and `parseApplication(body): { ok: true; data } | { ok: false; error: string }`:
  - trims strings, lowercases e-mails, requires fields per spec table, `DATE_RE`, birth date in past and age ≤ 100, password ≥ 8 and equals confirm, ZIP `^\d{3}\s?\d{2}$`, phone `^[+\d][\d\s]{8,}$` when present, `consent_gdpr === true`.
  - minor → parent fields required, emergency fields nulled; adult → phone + emergency required, parent fields nulled.
  - parent e-mail must differ from player e-mail.
- [ ] `npx tsc --noEmit`, commit.

### Task 3: E-mail templates + URL helper

**Files:** Modify `src/lib/email/templates.ts`, `src/lib/email/config.ts`

- [ ] `getParentRegisterUrl(token)` → `${getAppBaseUrl()}/parent/register?token=…`.
- [ ] Templates (same layout helpers): `buildManagerNewApplicationEmail`, `buildParentRegistrationEmail`, `buildParentChildLinkedEmail`, `buildPlayerApprovedEmail`, `buildPlayerApplicationRejectedEmail`.
- [ ] Fix `buildClubInviteEmail` expiry text to accept days ("platí 7 dní").
- [ ] tsc, commit.

### Task 4: Activation module

**Files:** Create `src/lib/onboarding/activation.ts`, `src/lib/onboarding/applications.ts`

- [ ] `applications.ts`: `type PlayerApplication`, `getApplicationForManager(user, id)` (returns null unless club owner), `listApplicationsForClub(clubId, statuses)`, `countPendingForClub(clubId)`, `findOpenApplicationByEmail(email)`.
- [ ] `activation.ts`:
  - `resolveParent(supabase, parentEmail, clubName)` → `{ kind: 'new' } | { kind: 'existing', userId } | { kind: 'conflict', reason }`.
  - `activateApplication(supabase, app, { parentUserId?, newParent? })`: insert player `users` (role hráč, organization club name, dateBirth, password_hash from app), insert `member_profiles`, optionally insert parent `users` + `parent_children`, `fullResyncCategories`, update app `status='completed', player_user_id`. On any error delete created rows in reverse order and throw.
- [ ] tsc, commit.

### Task 5: Invite send / accept / login

**Files:** Modify the three routes.

- [ ] send: expiry 7 days; reject if `findOpenApplicationByEmail` finds one.
- [ ] accept GET: unchanged shape + `requires_application: role === 'hráč'`.
- [ ] accept POST: if `invitation.role === 'hráč'` → `parseApplication`, check e-mail free in `users` + no open application, claim invitation, insert application (`pending_manager`), notify manager (in-app `player_application` + e-mail), return `{ success: true, pending: true }`. Other roles: existing code path unchanged.
- [ ] login: when no `users` row, look up open application by e-mail → 403 "Váš účet čeká na schválení klubem." / "Čekáme na registraci rodiče."; rejected → "Přihláška byla zamítnuta."
- [ ] tsc + lint, commit.

### Task 6: Manager API

**Files:** Create applications routes.

- [ ] GET `/api/applications` (manager only) → list open + recent; `?count=1` → `{ count }`.
- [ ] GET `/api/applications/[id]` detail incl. `parentCheck` from `resolveParent`; PATCH `{ parentEmail }` allowed in `pending_manager` / `pending_parent`.
- [ ] POST approve: adult → `activateApplication`, e-mail player. Minor: `resolveParent` → existing: activate with link, e-mail player + parent; conflict: 409; new: create `parent_invitations` (7 d), send e-mail, then set `pending_parent` (on e-mail failure delete invitation, 502).
- [ ] POST reject `{ reason }` → `rejected`, e-mail player.
- [ ] POST resend-parent: mark previous invitations used, new invitation, e-mail.
- [ ] Mark `reviewed_by`, `reviewed_at`. tsc + lint, commit.

### Task 7: Parent register API

**Files:** Create `src/app/api/parent/register/route.ts`

- [ ] GET `?token` → validate (exists, unused, not expired, app status `pending_parent`) → prefill `{ parent_first_name, parent_last_name, parent_email, parent_phone, child_name, club_name }`.
- [ ] POST `{ token, phone, password, passwordConfirm }` → claim token atomically, `resolveParent` (existing → link; conflict → 409), `activateApplication` with new parent (bcrypt 12), e-mails to both, notify manager. On activation failure un-claim token.
- [ ] tsc, commit.

### Task 8: Player form UI

**Files:** Create `src/app/invite/accept/PlayerApplicationForm.tsx`; modify `page.tsx`.

- [ ] Page: if `invite.requires_application` render `PlayerApplicationForm`, else the existing form.
- [ ] Form: controlled state, 3 steps with step indicator, per-step client validation (same rules), step 3 switches by `isMinor`, final summary + submit, success screen. Uses existing `form-group/form-input/form-label/auth-btn-primary` classes plus small CSS additions in `globals.css` (`.onb-steps`, `.onb-check`).
- [ ] tsc + lint, commit.

### Task 9: Parent register page

**Files:** Create `src/app/parent/register/page.tsx` (AuthShowcaseLayout, same pattern as invite accept).

- [ ] tsc + lint, commit.

### Task 10: Manager UI

**Files:** applications pages, `ApplicationActions.tsx`, `PendingApplicationsCard.tsx`, Sidebar, dashboard page.

- [ ] `/applications` list (table: jméno, věk, stav, odesláno) — manager only, else redirect `/dashboard`.
- [ ] `/applications/[id]` detail sections (osobní, adresa, zdraví, rodič / nouzový kontakt, souhlasy) + `ApplicationActions` (edit parent e-mail, approve, reject w/ reason, resend). Conflict warning from `parentCheck`.
- [ ] Dashboard: manager with pending > 0 → `PendingApplicationsCard` above overview.
- [ ] Sidebar: manager link "Přihlášky" with badge fetched from `/api/applications?count=1`.
- [ ] tsc + lint, commit.

### Task 11: Parent UI + member profile

**Files:** `src/lib/parent.ts`, select-child route, members profile route, parent components, dashboard page, member detail page.

- [ ] `parent.ts`: `getChildrenForParent(parentId)`, `isParentOf(parentId, childId)`, `getSelectedChildId(children)` reading cookie `tp_child`.
- [ ] `/api/parent/select-child` POST `{ childId }` → verify link, set cookie.
- [ ] `/api/members/[id]/profile` GET/PATCH: allowed if self, linked parent, or club manager (GET also coach). PATCH validates address/health/emergency fields, upserts.
- [ ] Dashboard: role rodič → `ParentOverview` (child switcher, upcoming events from `club_event_participants` where `excluded=false` and `starts_at >= now`, limit 10, child profile card, `ChildProfileForm`, "Platby" empty state).
- [ ] Member detail: manager/coach see "Zdraví a kontakty" section from `member_profiles` + linked parents.
- [ ] tsc + lint, commit.

### Task 12: Verify

- [ ] `npm run build` passes, `npm run lint` clean for touched files.
- [ ] Manual checklist from spec (8 scenarios) — run by user after migration is applied.
