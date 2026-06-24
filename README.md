# Spend Tracker

Self-hosted expense tracker with Expo (Android + Web) and FastAPI.

## Stack

- **Mobile/Web:** Expo + expo-router (offline SQLite on Android/iOS)
- **API:** FastAPI + SQLite (server)
- **Files:** MinIO (custom icons + receipt photos)

## Quick start — full stack (Docker)

```bash
./scripts/docker-up.sh
```

| Service | URL |
|---------|-----|
| **Web app** | http://localhost:8080 |
| **API** | http://localhost:8000 |
| **API docs** | http://localhost:8000/docs |
| **MinIO console** | http://localhost:9001 |

Configure [`docker/.env`](docker/.env) (copied from `.env.example` on first run):

- `EXPO_PUBLIC_API_URL` — URL the **browser** uses for the API (default `http://localhost:8000`)
- `WEB_PORT` — web frontend port (default `8080`)

Other scripts:

```bash
./scripts/docker-build.sh   # build images only
./scripts/docker-down.sh    # stop stack
./scripts/build-apk-docker.sh  # build Android APK in Docker
```

## Mobile dev (local)

```bash
cd apps/mobile
npm install
EXPO_PUBLIC_API_URL=http://localhost:8000 npm run web
# Android emulator:
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000 npm run android
```

On Android/iOS the app uses **offline-first SQLite** and syncs with the API when online.

## Build Android APK (Docker)

```bash
./scripts/build-apk-docker.sh
./scripts/build-apk-docker.sh --api-url http://192.168.1.10:8000  # physical device
./scripts/build-apk-docker.sh --release
```

Output: `build/android/spend-tracker-debug.apk`

## Project layout

```
spend-tracker/
├── api/                 # FastAPI backend
├── apps/mobile/         # Expo app
│   ├── Dockerfile.web   # Web static export + nginx
│   └── Dockerfile.apk   # Android APK builder
├── docker/              # docker-compose + .env
├── scripts/             # docker-up, docker-down, build-apk
└── reference/           # UI reference screenshots
```

## Reference UI

See [`reference/`](reference/) for target UX screenshots.
