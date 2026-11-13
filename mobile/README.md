# Everyday AI Concierge — Mobile App (React Native + Expo SDK 58)

Native iOS/Android app for the Everyday AI Concierge MVP. Shares the same backend API as the web MVP.

**Verified:** TypeScript clean (`npm run typecheck`) and Metro bundles for Android (`expo export`).

---

## 1. Prerequisites

- Node.js 20+ (you have it installed already)
- **Expo Go 58.x** on your phone (App Store / Play Store)
- Phone and laptop on the **same Wi-Fi network**
- Backend running on your laptop (port 4000)

No Android Studio / Xcode needed — Expo Go runs the JS bundle directly.

---

## 2. Start the backend (terminal 1)

```powershell
cd "C:\Users\abhi laptop\Desktop\everything ai\server"
npm run dev
```

Check it is up: open <http://localhost:4000/health>.
Expect `"status": "ok"` and `"database": "connected"` — PostgreSQL 16 is already
configured locally (`everyday` / `everyday_ai`, migration applied, demo data seeded).

Useful local psql path:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U everyday -d everyday_ai
```

---

## 3. Point the app at your laptop's IP

`mobile/.env` already contains:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.13:4000/api/v1
```

If your IP changes (new Wi-Fi, DHCP lease), find the new one:

```powershell
ipconfig
```

Copy the **IPv4 Address** of your Wi-Fi adapter into `mobile/.env`, then restart Metro with `-c`.

> `10.0.2.2` only works for the Android **emulator**, never for a physical phone.

---

## 4. Start Expo (terminal 2)

```powershell
cd "C:\Users\abhi laptop\Desktop\everything ai\mobile"
npm install        # already done, safe to re-run
npx expo start -c
```

A QR code appears. If Expo picks the wrong network adapter (common with WSL/Hyper-V), force it:

```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.1.13"
npx expo start -c
```

---

## 5. Open it on your phone

- **Android:** open **Expo Go** → *Scan QR code* → scan the terminal QR.
- **iPhone:** open the **Camera** app → scan the QR → tap *Open in Expo Go*.

First launch takes 30–60 s while the bundle builds. You should land on the sign-in screen.

**Register first** — there are no seeded users, so sign-in fails until you create an account.

---

## 6. If the phone can't reach the backend

| Symptom | Fix |
|---|---|
| Red screen / `Network request failed` | Phone and laptop must be on the same Wi-Fi |
| Wrong IP in QR code | Set `REACT_NATIVE_PACKAGER_HOSTNAME` (step 4) |
| Still fails on a locked-down network | `npx expo start --tunnel` (needs `@expo/ngrok`) |
| Windows Firewall blocks port 4000 | Run PowerShell **as Administrator**:<br>`New-NetFirewallRule -DisplayName "Everyday AI Backend 4000" -Direction Inbound -Protocol TCP -LocalPort 4000 -Action Allow` |
| IP changed | Update `mobile/.env`, then `npx expo start -c` |
| Version warning in Expo Go | Make sure the Expo Go app is **58.x**, matching SDK 58 |

---

## Screens

- **Sign in / Register** — customer, provider, admin accounts
- **Chat** — conversational interface with service, confirmation and status cards
- **Bookings** — customer booking history
- **Job Requests** (providers) — accept / decline incoming bookings
- **Admin Console** (admin/support) — provider verification, request queue, audit trail

## Demo mode

`AI_ENABLED=false` on the backend means every AI reply is the deterministic stub, labelled “Demo data — not real”. No payments, no real merchant orders.

## Tech stack

- Expo SDK 58.0.25 · React Native 0.88.1 · React 19.3.0
- React Navigation 7 (stack + bottom tabs)
- TypeScript 5.9
- AsyncStorage (token persistence)
- Fetch API (same backend as web)

## Production builds (later)

```powershell
npm install -g eas-cli
eas build -p android
eas build -p ios        # macOS / EAS cloud
```
