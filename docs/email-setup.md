# Emaily v TeamPulse

V nové aplikaci neposílej aplikační emaily přes Supabase Auth SMTP. To je jen pro systémové auth emaily Supabase. Pro TeamPulse emaily použij:

1. Supabase jako databázi a zdroj tokenů/stavu.
2. Next.js API routes jako aplikační vrstvu.
3. Resend jako provider pro odesílání emailů.

Aktuálně přenesené emailové toky z legacy PHP:

1. 2FA kód při přihlášení.
2. Pozvánka do klubu.
3. Reset hesla jako template.
4. Ověření emailu při založení klubu jako template.
5. Potvrzení založení klubu jako template.
6. Notifikace manažerovi o novém členovi jako template.

Reálně napojené do Next app dnes:

1. [src/app/api/auth/login/route.ts](src/app/api/auth/login/route.ts)
   Při zapnutém 2FA vygeneruje kód, uloží bcrypt hash do `two_factor_codes` a odešle email.
2. [src/app/api/auth/verify-2fa/route.ts](src/app/api/auth/verify-2fa/route.ts)
   Ověří bcrypt hash kódu a dokončí login.
3. [src/app/api/invite/send/route.ts](src/app/api/invite/send/route.ts)
   Uloží pozvánku do `team_invitations` a odešle email.

Sdílená email vrstva:

1. [src/lib/email/send.ts](src/lib/email/send.ts)
2. [src/lib/email/templates.ts](src/lib/email/templates.ts)
3. [src/lib/email/config.ts](src/lib/email/config.ts)

## Co nastavit v Supabase

Supabase pro tyto emaily nepotřebuješ jako SMTP server. Potřebuješ ho pro tabulky a tokeny:

1. Měj nasazené tabulky `team_invitations`, `password_resets`, `pending_registrations`, `two_factor_codes`.
2. Service role klíč nech pouze na serveru v Next aplikaci.
3. Pokud chceš používat Supabase Auth emaily (např. magic links), můžeš v Supabase Dashboardu nastavit `Auth > SMTP Settings`, ale to je oddělené od TeamPulse aplikačních emailů.

## Co nastavit v Resend

1. Vytvoř účet na Resend.
2. Přidej a ověř doménu, např. `mail.teampulse.cz` nebo `teampulse.cz`.
3. V DNS přidej požadované záznamy z Resend dashboardu.
4. Po ověření domény nastav odesílatele třeba jako `TeamPulse <noreply@teampulse.cz>`.

## Environment proměnné

Do `.env.local` přidej nebo uprav:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=...
EMAIL_FROM="TeamPulse <noreply@teampulse.cz>"
SUPPORT_EMAIL="podpora@teampulse.cz"

# Volitelné, pokud ještě nejsou nové accept/reset stránky hotové
INVITE_ACCEPT_URL_BASE="https://stara-domena/app/routes/accept-invite.php"
PASSWORD_RESET_URL_BASE="https://stara-domena/password/reset-password.php"
EMAIL_VERIFICATION_URL_BASE="https://stara-domena/verify-email.php"
```

Poznámka:

1. Dokud nebudeš mít v Next app hotové stránky pro přijetí pozvánky, reset hesla a ověření emailu, nech tyto URL dočasně mířit na legacy PHP.
2. Jakmile tyto flow migrujeme do Next, jen změníš base URL a nemusíš sahat do template logiky.

## Jak to zprovoznit lokálně

1. Doplň environment proměnné.
2. Spusť `npm run dev`.
3. Přihlas se uživatelem, který má `two_factor_enabled = true`.
4. Ověř, že přijde 2FA email.
5. Přihlas se jako manažer a na stránce pozvánek odešli testovací invite.

## Jak to zprovoznit v produkci

1. Nastav stejné proměnné v hostingu pro Next app.
2. Ujisti se, že `NEXT_PUBLIC_APP_URL` odpovídá produkční doméně.
3. Nastav `EMAIL_FROM` na ověřenou doménu v Resend.
4. Pokud už bude migrace dokončená, přesměruj `INVITE_ACCEPT_URL_BASE`, `PASSWORD_RESET_URL_BASE` a `EMAIL_VERIFICATION_URL_BASE` na nové Next routy.

## Co ještě zbývá napojit

Tyto templaty už v kódu jsou, ale zatím nejsou napojené na UI flow nové aplikace:

1. Reset hesla.
2. Registrace klubu + ověření emailu.
3. Potvrzení založení klubu.
4. Notifikace manažerovi po přijetí pozvánky.

Další logický krok je migrovat accept-invite, password reset a club registration flow z PHP do Next a použít už připravené templaty bez dalších změn v email vrstvě.