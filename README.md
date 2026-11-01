<div align="center">

# 🚗 Grand i10 Nios

**A personal car companion for the Hyundai Grand i10 Nios — trips, fuel, expenses, documents & maintenance, all offline-first.**

[![Release](https://img.shields.io/github/v/release/SouravFrank/Grand-i10-Nios?style=flat-square)](https://github.com/SouravFrank/Grand-i10-Nios/releases)
[![Expo SDK](https://img.shields.io/badge/Expo_SDK-55-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.83-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Platform](https://img.shields.io/badge/Platform-Android-3DDC84?style=flat-square&logo=android&logoColor=white)](#)

*Built for exactly 2 users · Biometric login · Firebase Realtime Database sync*

</div>

---

## ✨ Features

**Authentication & Security**

- Frontend-only auth for exactly 2 trusted users
- Biometric unlock on subsequent launches (Expo Local Authentication)
- Credentials in SecureStore, hashed session tokens, local integrity hashing for tamper detection

**Data & Sync**

- Offline-first writes — everything queues locally and flushes on app launch or network regain
- Optimistic local updates with non-blocking background sync
- Firebase Realtime Database as the sync backend (entries, car spec, documents, reports)
- Odometer rollback prevention + queue retry on launch and network recovery

**Car & Tracking**

- Unified history with dynamic distance calculation between consecutive entries
- Trips (start / end, shared), fuel fills, expenses & NHAI FASTag annual-pass tracking
- Monthly reports with settlement sync and mileage-by-month statistics
- Car document vault — RC, insurance, PUC, tyres and service records with edit history

## 🧱 Tech Stack

| Layer | Tech |
| --- | --- |
| Framework | Expo SDK 55 · React Native 0.83 · TypeScript |
| Navigation | React Navigation (native stack) |
| State | Zustand (persisted) |
| Forms | React Hook Form + Zod |
| Auth & Security | Expo Local Authentication · Expo SecureStore |
| Sync | Firebase JS SDK (Realtime Database) |
| Storage | AsyncStorage |
| Utilities | Day.js · NetInfo |

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure Firebase (see below)
cp .env.example .env

# 3. Start the dev server
npm run start
```

Create a local `.env` file (do not commit it) from `.env.example` with:

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase web API key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project id |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender id |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase app id |
| `EXPO_PUBLIC_FIREBASE_DATABASE_URL` | Realtime Database URL |
| `EXPO_PUBLIC_SYNC_DEBUG` | Optional — enables `[SYNC_DEBUG]` logs on device/builds |

> 💡 If Firebase config is not set, the app still works **fully offline** and keeps queueing writes locally.

## 📦 Build & Release

| Command | What it does |
| --- | --- |
| `npm run build:android:apk` | Bumps version, prebuilds, builds a local Gradle release APK (arm64 + armeabi) and exports it |
| `npm run build:android:aab` | Builds a local Gradle release bundle |
| `npm run build:android:apk:cloud` | EAS cloud build (`release-apk` profile) |
| `npm run build:android:aab:cloud` | EAS cloud build (`production` profile) |
| `npm run version:bump:patch` | Bumps the package version |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript checks |

## 🗂 Project Structure

```text
├── App.tsx                      # app bootstrap + error boundary
├── database.rules.json          # Firebase Realtime Database security rules
└── src
    ├── navigation/              # React Navigation root stacks
    ├── screens/                 # login, biometric, home, history, odometer, fuel flows
    ├── components/              # shared UI components
    ├── store/useAppStore.ts     # persisted app state, queue, auth status, integrity checks
    ├── services
    │   ├── sync/syncEngine.ts   # background sync and retry logic
    │   ├── realtime/            # Realtime Database push/pull repositories
    │   ├── auth/                # password + biometric auth logic
    │   └── storage/             # AsyncStorage and SecureStore adapters
    ├── hooks/                   # sync bootstrap and app hooks
    ├── types/                   # shared models
    └── utils/                   # logging and helpers
```

## 🔒 Security Notes

- `.env` is never committed — Firebase credentials live in local env / EAS secrets
- Realtime Database access is governed by [`database.rules.json`](database.rules.json)
- Entries carry local integrity hashes so tampering can be detected on-device
