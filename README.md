<p align="center">
  <img src="logo.png" alt="BreakingBank" width="220" />
</p>

<h1 align="center">BreakingBank</h1>

<p align="center">
  <strong>Your money, your server, your rules.</strong><br/>
  A self-hosted expense tracker that’s actually fun to use — on phone, browser, or both at once.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo-56-000020?style=flat-square&logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/SQLite-offline--first-003B57?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/license-self--host-8BC34A?style=flat-square" alt="Self-hosted" />
</p>

---

## What is this?

**BreakingBank** helps you track **gastos**, **ingresos**, cuentas, and shared family budgets — without sending your financial life to a random cloud you don’t control.

Think of it as the love child of a spreadsheet that finally learned design and an app that respects your privacy. You run the API. You run the database. You break the bank — responsibly.

| Platform | Experience |
|----------|------------|
| **Android** | Offline-first app with bottom tabs, sync when online |
| **Web** | Material sidebar layout, same data as mobile |
| **API** | FastAPI + SQLite, group-scoped multi-user |

---

## Features

### Money moves

- **Expenses & income** — segmented tabs, amounts in multiple currencies, comments, labels
- **Accounts** — balances computed from movements + transfers + initial balance
- **Categories** — preset or custom icons (stored in MinIO)
- **Transfers** — move money between your own accounts
- **Receipt photos** — attach up to 3 images per transaction (synced to object storage)
- **Charts** — category breakdowns by day / week / month / year

### Set it and (mostly) forget it

- **Recurring payments** — Netflix, rent, salary… daily, weekly, monthly, or yearly
- **Smart reminders** — when a recurring payment is due, you get a nudge; tap to confirm, edit, or auto-create the transaction
- **Export / import** — monthly `.xlsx` or `.csv` in the classic spreadsheet format (Spanish column headers, Excel date serials, the works)

### Share the pain (a.k.a. family budget)

- **Groups** — e.g. `FamilyAdams`: multiple users, one shared ledger
- **Invite by email** — add members who already have an account
- **Roles** — owner / editor / viewer per group
- **Active group** — switch context; data syncs per group via `X-Group-Id`

### Looks & feels

- **Material-style UI** — rounded surfaces, chips, bottom tabs (mobile), sidebar (web)
- **Themes** — light, dark, or follow the system
- **Languages** — Español, English, or device default (live switching)
- **BreakingBank branding** — logo on login, sidebar, and app icon

### Auth & security

- **Email + password** registration and login
- **Google Sign-In** — web OAuth + native Android (configure client IDs + SHA-1)
- **JWT** access + refresh tokens
- **Self-hosted** — your `JWT_SECRET`, your MinIO, your SQLite file

### Offline & sync (Android / iOS)

- Local **SQLite** is the source of truth on device
- **Sync queue** pushes mutations when back online
- **Pull** merges server state; conflict log for edge cases
- Web talks to the API directly (no local DB)

---

## Quick start — full stack (Docker)

One command to rule them all:

```bash
./scripts/docker-up.sh
```

| Service | URL |
|---------|-----|
| **Web app** | http://localhost:8080 |
| **API** | http://localhost:8000 |
| **API docs** | http://localhost:8000/docs |
| **MinIO console** | http://localhost:9001 |

On first run, `docker/.env` is created from `.env.example`. Tune at least:

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_URL` | URL the **browser** uses to reach the API |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google Sign-In (web + Android `webClientId`) |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Android OAuth client (Console + SHA-1) |
| `GOOGLE_CLIENT_ID` | API token validation (same as web client) |
| `JWT_SECRET` | Change in production |
| `WEB_PORT` | Web UI port (default `8080`) |

Other helpers:

```bash
./scripts/docker-build.sh      # build images only
./scripts/docker-down.sh       # stop stack
./scripts/build-apk-docker.sh  # Android APK via Docker (no local SDK)
```

---

## Mobile development

```bash
cd apps/mobile
npm install
EXPO_PUBLIC_API_URL=http://localhost:8000 npm run web

# Android emulator → host machine API:
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000 npm run android
```

Physical device on LAN:

```bash
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000 npm run android
```

---

## Build Android APK

```bash
./scripts/build-apk-docker.sh
./scripts/build-apk-docker.sh --api-url http://192.168.1.10:8000
./scripts/build-apk-docker.sh --release
```

Output: `build/android/breakingbank-release.apk` (or `breakingbank-debug.apk` for debug builds).

Package name: `com.breakingbank.app`

---

## CI / Docker Hub images

Pushes to `main` trigger path-filtered GitHub Actions:

| Workflow | Paths | Publishes |
|----------|-------|-----------|
| **API Docker** | `api/**` | `alexiscaspell/breakingbank-api` |
| **UI Docker** | `apps/mobile/**` | `alexiscaspell/breakingbank-ui` |
| **APK Release** | `apps/mobile/**` | GitHub Release + `breakingbank-release.apk` |

APK versions use **conventional commits** (`feat:` → minor, `fix:` → patch, `BREAKING CHANGE` → major).

**Secrets:** `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`  
**Variables:** `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

---

## Project layout

```
BreakingBank/
├── api/                    # FastAPI backend (groups, sync, export, auth…)
├── apps/mobile/            # Expo app (Android, iOS, Web)
│   ├── Dockerfile.web      # Static export + nginx
│   └── Dockerfile.apk      # Android APK builder
├── docker/                 # docker-compose + .env
├── scripts/                # docker-up, build-apk, CI helpers
├── .github/workflows/      # API, UI, APK pipelines
├── logo.png                # Brand mark (also in mobile assets)
└── reference/              # UI reference screenshots
```

---

## API highlights

| Area | Endpoints (examples) |
|------|---------------------|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/google` |
| Groups | `GET/POST /groups`, invite `POST /groups/{id}/members` |
| Data | accounts, categories, labels, transactions, transfers |
| Sync | `POST /sync/push`, `GET /sync/pull` |
| Export | `GET /export/transactions`, `POST …/import` |
| Recurring | `GET/POST/PUT /recurring-payments` |

Full interactive docs at `/docs` when the API is running.

---

## Navigation map (app)

| Tab / area | What you do there |
|------------|-------------------|
| **Inicio** | Dashboard, period chips, totals |
| **Movimientos** | Transaction list, add / edit |
| **Cuentas** | Account balances |
| **Gráficos** | Category charts |
| **Más** | Export, categories, recurring, reminders, groups, settings |

---

## Reference UI

Target UX inspiration lives in [`reference/`](reference/) (screenshots from the original app format).

Sample import/export spreadsheet: `2026_06_23_20_18_04_305060.xlsx` at repo root.

---

## Philosophy (the short version)

1. **Offline should work** — subway mode is real.
2. **Families share ledgers** — not passwords on a shared Google Sheet.
3. **Export should not be hostage-ware** — it’s your data, Excel or CSV.
4. **Recurring bills need reminders** — not surprise overdrafts.
5. **Self-hosted means yours** — spin it up on a Pi, a VPS, or Docker on your laptop.

---

<p align="center">
  <sub>BreakingBank — because your wallet deserves better than a mystery subscription you forgot about in 2019.</sub>
</p>
