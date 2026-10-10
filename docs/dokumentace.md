# Klauzurní práce – TeamPulse

**Tomáš Kotík, 3.C**

CHC | 2025/26

---

## Obsah

1. Úvod
2. Použité technologie
3. Struktura a propojení částí aplikace
   - 3.1 Frontend – stránky a routing
   - 3.2 Backend – API endpointy
   - 3.3 Sdílené knihovny (lib/)
   - 3.4 Komponenty uživatelského rozhraní
4. Databáze
5. Zabezpečení aplikace
6. Závěr
7. Zdroje

---

## 1. Úvod

TeamPulse je webová aplikace určená pro správu sportovních klubů. Umožňuje klubům centrálně spravovat své členy, komunikovat prostřednictvím integrovaného chatu, plánovat události a sledovat aktivitu týmu prostřednictvím přehledného dashboardu. Aplikace je navržena jako multi-tenantní platforma, kde každý sportovní klub funguje jako samostatná organizace s vlastními členy, nastaveními a vizuálním stylem.

Registrace klubu probíhá přes veřejný formulář, přičemž každá žádost o registraci musí být schválena administrátorem platformy. Po schválení může manažer klubu přidávat členy pomocí systému pozvánek zasílaných e-mailem. Aplikace podporuje několik uživatelských rolí – manažer, trenér, hráč, rodič a jiné – přičemž každá role má odlišná oprávnění v rámci klubu.

Mezi klíčové funkce aplikace patří správa kategorií (skupin členů), integrovaný týmový chat s real-time aktualizacemi, správa událostí, systém notifikací a přizpůsobitelný dashboard. Aplikace také nabízí možnost customizace vizuálního stylu klubu včetně barevného schématu a vizuálních efektů rozhraní.

---

## 2. Použité technologie

### Next.js (App Router)

Next.js [1] je full-stack webový framework postavený na Reactu. V tomto projektu je využíván ve verzi 16 s moderním App Routerem, který umožňuje definovat jak frontendové stránky (Server Components, Client Components), tak backendové API route handlery v rámci jednoho projektu. Next.js zajišťuje server-side rendering, statické generování a optimalizaci výkonu aplikace.

### React

React [2] je JavaScriptová knihovna pro tvorbu uživatelských rozhraní. Aplikace využívá React 19, který přináší vylepšení výkonu a nové hooks API. Interaktivní části rozhraní jsou implementovány jako Client Components, zatímco statičtější části využívají Server Components pro optimalizaci načítání a snížení množství JavaScriptu odesílaného klientovi.

### TypeScript

TypeScript [3] je nadstavba JavaScriptu přidávající statické typování. Celá aplikace je psána v TypeScriptu, což výrazně snižuje výskyt chyb za běhu a zlepšuje čitelnost kódu. Sdílené datové typy jsou centrálně definovány v souboru `lib/types.ts` a využívány napříč celou aplikací.

### Supabase

Supabase [4] je open-source platforma postavená na PostgreSQL databázi. V projektu je využívána pro ukládání dat, real-time komunikaci prostřednictvím WebSocket subscriptions (chat, notifikace) a cloudové úložiště souborů (loga klubů, profilové fotografie). Přístup k Supabase probíhá prostřednictvím oficiálního JavaScript SDK s oddělenými klienty pro serverové a klientské prostředí.

### Resend

Resend [5] je e-mailová služba pro vývojáře. Aplikace ji využívá pro odesílání transakčních e-mailů – pozvánky do klubu, ověření e-mailové adresy, resetování hesla a notifikace o schválení či zamítnutí registrace.

### bcrypt.js

bcrypt.js [6] je knihovna pro bezpečné hashování hesel. Uživatelská hesla jsou v databázi ukládána výhradně ve formě bcrypt hashe a nikdy v čitelné podobě. Při přihlašování je zadané heslo porovnáváno s uloženým hashem bez nutnosti heslo dešifrovat.

### JOSE

JOSE [7] je knihovna pro práci s JWT (JSON Web Tokens) standardy. Je využívána pro vytváření a ověřování session tokenů a tokenů důvěryhodných zařízení, které jsou přenášeny jako HTTP-only cookies.

### Recharts

Recharts [8] je knihovna pro vizualizaci dat v Reactu. Dashboard využívá Recharts pro zobrazení statistik a přehledů ve formě interaktivních grafů (vývoj počtu členů, aktivita v chatu, účast na událostech).

### DnD Kit

DnD Kit [9] je sada knihoven pro drag-and-drop interakce v Reactu. Je využívána pro přeskupování widgetů na dashboardu podle preferencí uživatele, přičemž pořadí widgetů je ukládáno do databáze.

---

## 3. Struktura a propojení částí aplikace

Aplikace je organizována v adresáři `src/` podle konvencí Next.js App Routeru a rozdělena do čtyř hlavních oblastí: frontendové stránky, backendové API endpointy, sdílené pomocné knihovny a komponenty uživatelského rozhraní.

### 3.1 Frontend – stránky a routing

Next.js App Router využívá souborový systém pro definici URL adres. Každá složka v adresáři `app/` odpovídá jedné URL adrese. Stránky jsou rozděleny do skupin pomocí tzv. route groups označených kulatými závorkami.

**Skupina `(auth)`** obsahuje stránky pro přihlášení uživatele. Přihlašovací formulář validuje vstup na straně klienta a odesílá přihlašovací údaje na backend API. V případě aktivního dvoufaktorového ověření je uživatel vyzván k zadání jednorázového kódu zaslaného e-mailem.

**Skupina `(dashboard)`** je chráněná část aplikace přístupná pouze přihlášeným uživatelům. Obsahuje následující stránky:

- **Dashboard** – hlavní přehledová stránka s widgety zobrazujícími statistiky klubu, nadcházející události a aktivitu členů. Rozvržení widgetů je přizpůsobitelné pomocí drag-and-drop.
- **Grafy** – detailní vizualizace dat klubu ve formě interaktivních grafů zobrazujících vývoj počtu členů, aktivitu v chatu a účast na událostech.
- **Kategorie** – správa skupin členů. Manažer může vytvářet kategorie s vlastní barvou (např. „A tým", „B tým", „Junioři"), přiřazovat do nich členy a aplikovat předdefinované šablony pro různé typy sportů.
- **Události** – správa klubových událostí s datem, popisem, místem konání a přiřazenými kategoriemi účastníků.
- **Chat** – týmový chat s real-time aktualizacemi prostřednictvím Supabase Realtime WebSocket připojení. Nové zprávy se zobrazují okamžitě bez nutnosti obnovovat stránku.
- **Členové** – adresář členů klubu s možností zobrazení profilu každého člena, editace jeho role a data narození nebo odebrání ze klubu.
- **Notifikace** – přehled systémových notifikací (přijetí pozvánky, schválení registrace, změny v klubu).
- **Pozvánky** – rozhraní pro odesílání e-mailových pozvánek novým členům s volbou role.
- **Profil** – editace vlastního profilu uživatele (jméno, profilová fotografie, heslo).
- **Nastavení** – nastavení vizuálního stylu klubu (primární a sekundární barva, vizuální efekty rozhraní) a osobní bezpečnostní nastavení (dvoufaktorové ověření).

Mimo skupiny dashboardu existují veřejně přístupné stránky: **Založ klub** (registrační formulář pro nové kluby s kompletními údaji), **Přijmout pozvánku** (stránka zpracovávající token z e-mailové pozvánky), **Ověření e-mailu** a **Resetování hesla**.

Administrátorská část aplikace je dostupná na adrese `/admin` a obsahuje přihlašovací stránku a zabezpečený panel pro správu klubů (schválení, zamítnutí, smazání) a uživatelů.

### 3.2 Backend – API endpointy

Backend je implementován formou Next.js Route Handlers – serverových funkcí spouštěných při každém HTTP požadavku. Endpointy jsou organizovány do skupin podle funkcionality v adresáři `app/api/`:

**Autentizace** (`/api/auth/`) zajišťuje přihlášení, odhlášení a ověření dvoufaktorového kódu. Přihlašovací endpoint ověřuje heslo pomocí bcrypt, generuje session JWT token a nastaví jej jako HTTP-only cookie pro maximální bezpečnost. Cookie příznak `HttpOnly` znemožňuje přístup k tokenu z JavaScriptu, čímž je aplikace odolná vůči XSS útokům.

**Správa klubu** (`/api/club/`) zahrnuje registraci nového klubu, získání profilu, nahrání loga a ověření e-mailové adresy. Registrace je dvoustupňová: nejprve se údaje uloží do tabulky čekajících registrací a po ověření e-mailové adresy čeká žádost na schválení administrátorem.

**Administrátorské endpointy** (`/api/admin/`) obsluhují přihlašování administrátora a správu klubů (schválení, zamítnutí, smazání) a uživatelů. Každý administrátorský endpoint ověřuje platnost administrátorského session tokenu.

**Profil uživatele** (`/api/profile/`) umožňuje aktualizaci osobních údajů, změnu hesla a nahrání profilové fotografie. Fotografie jsou ukládány do Supabase Storage a přístupné přes speciální file-serving route.

**Kategorie** (`/api/categories/`) poskytují CRUD operace pro správu kategorií, přiřazení členů, aplikaci šablon a synchronizaci dat.

**Události** (`/api/events/`) obsluhují vytváření, editaci a mazání klubových událostí.

**Chat** (`/api/chat/messages/`) zajišťuje načítání historických zpráv a odesílání nových zpráv do databáze. Příjem real-time zpráv probíhá přímo na straně klienta přes Supabase Realtime.

**Notifikace** (`/api/notifications/`) umožňují načítání notifikací a jejich označení jako přečtených.

**Pozvánky** (`/api/invite/`) generují jedinečné tokenové pozvánky zasílané e-mailem a zpracovávají přijetí pozvánky registrací nového uživatele.

**Nastavení** (`/api/settings/`) ukládají barevné schéma klubu, vizuální efekty a přizpůsobený layout dashboardu.

### 3.3 Sdílené knihovny (lib/)

Adresář `lib/` obsahuje sdílenou business logiku využívanou jak stránkami, tak API endpointy.

**Autentizace** (`lib/auth/`) zahrnuje logiku pro správu sessions (vytváření, ověřování a invalidaci JWT tokenů v cookies), administrátorskou autentizaci, dvoufaktorové ověření (generování a zasílání 6místných kódů) a správu tokenů zařízení pro zapamatování důvěryhodných zařízení.

**Supabase** (`lib/supabase/`) inicializuje Supabase klienty pro serverové a klientské prostředí. Server-side klient využívá servisní role klíč s plnými databázovými oprávněními, klientský klient používá veřejný anonymní klíč pro bezpečný přístup z prohlížeče.

**E-mail** (`lib/email/`) konfiguruje Resend službu a obsahuje šablony pro všechny typy transakčních e-mailů: pozvánky do klubu, ověření e-mailové adresy, resetování hesla a notifikace o schválení či zamítnutí registrace.

**Úložiště** (`lib/storage/`) poskytuje funkce pro nahrávání souborů do Supabase Storage včetně validace formátu a velikosti. Spravuje loga klubů i profilové fotografie uživatelů.

**Typy** (`lib/types.ts`) centrálně definuje TypeScript typy sdílené napříč celou aplikací. Klíčové typy jsou `User` (uživatel s rolí, profilem a bezpečnostními přiznaky), `Club` (klub s vizuálním nastavením a stavem schválení) a `ChatMessage`. Výčtový typ `UserRole` definuje povolené role: `hráč`, `trenér`, `manažer`, `rodič`, `jiné`.

**Metriky dashboardu** (`lib/dashboard-metrics.ts`) obsahují výpočetní logiku pro statistiky zobrazované jako widgety na hlavní stránce dashboardu.

**Šablony kategorií** (`lib/category-templates.ts`) definují předdefinované sady skupin pro různé typy sportů, které může manažer jedním kliknutím aplikovat a ušetřit čas při prvotním nastavení klubu.

### 3.4 Komponenty uživatelského rozhraní (components/)

Adresář `components/` obsahuje znovupoužitelné React komponenty sdílené napříč různými stránkami aplikace.

**Navigace** – `Sidebar` (levá navigační lišta v dashboardu s ikonkami a textem), `Topbar` (horní lišta s notifikačním zvonem a uživatelským profilem), `MobileBottomBar` (spodní navigace pro mobilní zařízení) a `PublicNavbar` (navigace na veřejně přístupných stránkách).

**Dashboard** – `DesktopOverview` a `GraphDetail` poskytují vizualizaci dat s využitím knihovny Recharts. Widgety jsou přetahovatelné pomocí DnD Kit.

**Správa klubu a členů** – `ClubLogoUploader` (nahrávání a ořezávání loga pomocí CropperJS), `RemoveMemberButton` (odebrání člena s potvrzovacím dialogem), `MemberRoleEditor` (inline editace role člena), `MemberBirthDateEditor` (editace data narození) a `ClubDangerActions` (nebezpečné operace jako trvalé smazání klubu s potvrzením).

**Administrace** – `AdminPanelClient` (hlavní rozhraní administrátorského panelu), `ClubApprovalActions` (tlačítka schválení a zamítnutí žádostí o registraci), `AdminClubDeleteAction` a `UserModerationActions` (správa uživatelů).

**Systémové komponenty** – `NotificationBell` zobrazuje ikonku zvonu s počtem nepřečtených notifikací a rozbalovací přehled posledních upozornění.

---

## 4. Databáze

Aplikace využívá PostgreSQL databázi hostovanou v Supabase. Struktura databáze je spravována pomocí 14 migračních souborů uložených ve složce `supabase/migrations/`. Celkem databáze obsahuje 15 tabulek.

*[ZDE VLOŽTE SNÍMEK DATABÁZOVÉHO SCHÉMATU]*

| Tabulka | Popis |
|---|---|
| users | Uživatelé aplikace – členové klubů a administrátoři |
| clubs | Sportovní kluby registrované v aplikaci |
| pending_registrations | Žádosti o registraci čekající na ověření e-mailu |
| chat_messages | Zprávy týmového chatu |
| team_invitations | Pozvánky pro nové členy zaslané e-mailem |
| notifications | Systémové notifikace pro uživatele |
| club_events | Události (tréninky, zápasy, srazy) klubu |
| club_categories | Kategorie neboli skupiny členů v rámci klubu |
| category_members | Přiřazení uživatelů do kategorií (vazební tabulka) |
| club_event_categories | Vazba události na kategorii |
| club_event_participants | Účastníci konkrétních událostí |
| device_tokens | Tokeny důvěryhodných zařízení pro přeskočení 2FA |
| two_factor_codes | Dočasné kódy pro dvoufaktorové ověření |
| password_resets | Tokeny pro resetování hesla |
| sms_verifications | Kódy pro SMS ověření telefonu |

**Tabulka `users`** uchovává základní informace o uživatelích: jméno, příjmení, e-mail, telefonní číslo, roli v klubu, odkaz na profilovou fotografii, příznak administrátora a příznak aktivního dvoufaktorového ověření. Heslo je uloženo výhradně jako bcrypt hash.

**Tabulka `clubs`** ukládá data o registrovaných klubech: název, sport, město, adresu, IČO, DIČ, webovou stránku, kontaktní údaje, odkaz na logo, primární a sekundární barvy pro vizuální identitu, příznak schválení administrátorem a JSON pole s přizpůsobeným layoutem dashboardu.   

**Tabulka `club_categories`** umožňuje manažerovi rozdělit členy do pojmenovaných skupin s vlastní barvou. Tabulka `category_members` realizuje vazbu M:N mezi uživateli a kategoriemi. Tabulky `club_event_categories` a `club_event_participants` propojují události s kategoriemi a sledují účast konkrétních členů.

Supabase Realtime je aktivováno pro tabulky `chat_messages` a `notifications`, což umožňuje okamžité zobrazení nových zpráv a notifikací v prohlížeči bez obnovování stránky. Real-time komunikace probíhá prostřednictvím WebSocket protokolu.

---

## 5. Zabezpečení aplikace

Bezpečnost je v aplikaci řešena na několika úrovních. Přihlašování využívá kombinaci hashovaného hesla (bcrypt) a session JWT tokenu uloženého jako HTTP-only cookie, čímž je token nedostupný pro JavaScript na straně klienta a aplikace je odolná vůči XSS útokům.

Volitelná dvoufaktorová autentizace přidává druhý ověřovací faktor. Po zadání správného hesla je uživateli zaslán jednorázový 6místný kód e-mailem, který musí být zadán pro dokončení přihlášení. Kódy mají omezenou dobu platnosti a jsou jednorázové.

Systém tokenů důvěryhodných zařízení umožňuje označit konkrétní zařízení, na kterém se krok dvoufaktorového ověření přeskočí po dobu platnosti tokenu. Token je uložen jako HTTP-only cookie v prohlížeči a jako hash v databázové tabulce `device_tokens`.

Administrátorská část aplikace je chráněna samostatnou autentizací s odděleným přihlášením a oddělenými session tokeny. Všechny chráněné stránky dashboardu i administrátorského panelu ověřují platnost session tokenu na serveru při každém požadavku dříve, než je vrácen jakýkoli obsah.

---

## 6. Závěr

TeamPulse vznikl jako odpověď na potřebu jednoduché a dostupné platformy pro správu sportovních klubů, která by nevyžadovala složité nastavení ani technické znalosti od koncových uživatelů. Výsledkem je funkční webová aplikace pokrývající základní potřeby sportovního klubu – správu členů, komunikaci, plánování a přehled dat.

Aplikaci hodnotím jako úspěšně dokončený projekt s funkčním základem. Podařilo se implementovat všechny klíčové funkce: registrační workflow s e-mailovým ověřením a administrátorským schválením, real-time chat, systém kategorií a událostí, přizpůsobitelný dashboard a komplexní zabezpečení včetně dvoufaktorové autentizace.

Jako hlavní nedostatek vidím absenci granulárního systému oprávnění uvnitř klubu. V současné implementaci jsou oprávnění jednotlivých rolí (trenér, manažer, hráč) odlišena pouze na základní úrovni a v reálném nasazení by bylo žádoucí jemnější nastavení přístupu k jednotlivým funkcím. Dalším omezením je absence mobilní aplikace – webová aplikace je sice responzivní a použitelná na mobilních zařízeních, ale nativní mobilní zkušenost by pro sportovce byla výhodnější.

Z technologického hlediska bych se při opakování projektu zaměřil na důslednější využití React Server Components od samého začátku, což by snížilo množství JavaScriptu odesílaného klientovi a zlepšilo výkon při prvním načtení stránky. Volbu Supabase hodnotím jako správnou – platforma výrazně urychlila vývoj díky integrované databázi, real-time funkcím a cloudovému úložišti v jednom místě.

---

## 7. Zdroje

[1] Next.js – dokumentace. Vercel, Inc. Dostupné z: https://nextjs.org/docs

[2] React – dokumentace. Meta Platforms, Inc. Dostupné z: https://react.dev

[3] TypeScript – dokumentace. Microsoft Corporation. Dostupné z: https://www.typescriptlang.org/docs

[4] Supabase – dokumentace. Supabase, Inc. Dostupné z: https://supabase.com/docs

[5] Resend – dokumentace. Resend. Dostupné z: https://resend.com/docs

[6] bcrypt.js – balíček. npm registry. Dostupné z: https://www.npmjs.com/package/bcryptjs

[7] JOSE – balíček. npm registry. Dostupné z: https://www.npmjs.com/package/jose

[8] Recharts – dokumentace. Dostupné z: https://recharts.org/en-US

[9] DnD Kit – dokumentace. Dostupné z: https://dndkit.com
