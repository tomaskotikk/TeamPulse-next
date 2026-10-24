# TeamPulse – mobilní aplikace (Expo)

Aplikace pro hráče a rodiče. Volá API Next.js aplikace (`/api/...`) s tokenem v hlavičce
`Authorization: Bearer`, takže sdílí účty, oprávnění i data s webem.

## Spuštění

```bash
cd mobile
npm install
cp .env.example .env   # doplnit hodnoty (viz níže)
npx expo start
```

QR kód naskenuj aplikací **Expo Go** (iPhone: fotoaparát, Android: přímo v Expo Go).

## Proměnné prostředí (`mobile/.env`)

| Proměnná | Význam |
|---|---|
| `EXPO_PUBLIC_API_URL` | adresa Next.js backendu, např. `https://www.teampulse.cfd` |
| `EXPO_PUBLIC_SUPABASE_URL` | URL Supabase projektu (jen pro realtime signál v chatu) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | veřejný anon klíč (stejný jako `NEXT_PUBLIC_SUPABASE_ANON_KEY` na webu) |

## Struktura

- `src/app/` – obrazovky (Expo Router): `login`, `(tabs)/index|events|chat|profile`, `event/[id]`
- `src/components/ui.tsx` – sdílené komponenty (seznamy, karta události, avatar…)
- `src/lib/` – API klient, přihlášení, motiv podle barev klubu, realtime

## Backend

Endpointy pro aplikaci jsou v `src/app/api/mobile/*` v hlavním projektu. Po změně backendu
je nutné ho nasadit (push na GitHub → Vercel), jinak je aplikace neuvidí.
