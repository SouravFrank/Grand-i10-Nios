# Grand i10 Nios - Shared Maintenance Tracker

Production-grade Expo React Native app for exactly 2 users, with frontend-only authentication and Firebase Realtime Database-backed sync.

## Stack

- Expo SDK 55 + TypeScript
- React Navigation (native stack)
- Zustand (persisted app state)
- React Hook Form + Zod
- AsyncStorage + Expo SecureStore
- Expo Local Authentication (biometric)
- Firebase JS SDK (Realtime Database)
- Day.js
- NetInfo (network detection)

## Features

- Frontend-only authentication for exactly 2 users
- Biometric unlock on subsequent launches
- Offline-first writes (`entries[]` + `pendingQueue[]`)
- Optimistic local updates with non-blocking sync
- Queue retry on app launch and network regain
- Odometer rollback prevention
- Local integrity hashing for tamper detection
- Unified history with dynamic distance calculation between consecutive entries

## Login Users (default)

- `owner` / `Nios@1234`
- `coDriver` / `Nios@5678`

## Firebase Setup

Create a local `.env` file (do not commit it) from `.env.example`:

```bash
cp .env.example .env
```

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_FIREBASE_DATABASE_URL`

If Firebase config is not set, the app still works fully offline and keeps queueing writes locally.

## Run

```bash
npm install
npm run start
```

## Project Structure

- `App.tsx`: app bootstrap + error boundary
- `src/navigation`: React Navigation root stacks
- `src/screens`: login, biometric, home, history, odometer, fuel flows
- `src/store/useAppStore.ts`: persisted app state, queue, auth status, integrity checks
- `src/services/sync/syncEngine.ts`: background sync and retry logic
- `src/services/realtime/entriesRepository.ts`: Realtime Database push/pull
- `src/services/auth`: password + biometric auth logic
- `src/services/storage`: AsyncStorage and SecureStore adapters
