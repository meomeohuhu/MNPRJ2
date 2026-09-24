# VKU Reserve Mobile

Expo React Native client for the VKU room booking API.

## Run with Expo Go

```bash
cd mobile
npm install
cp .env.example .env
npm start
```

Set `EXPO_PUBLIC_API_BASE_URL` to your Render API URL:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-render-service.onrender.com/api
```

For local Android emulator testing, the app defaults to:

```text
http://10.0.2.2:3001/api
```

For a physical phone on the same Wi-Fi, use your computer LAN IP instead:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.x:3001/api
```

## Google Login

Use the same Google Web OAuth Client ID as the backend:

```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

The app uses Expo AuthSession to receive a Google ID token, then sends it to the existing Express endpoint `POST /api/auth/google`.

## Features

- Native `FlatList` room discovery.
- Building/capacity/equipment filters.
- 7-day date selector and fixed 2-hour slots.
- Conflict-aware booking through the Express API.
- Zustand state persisted with AsyncStorage.
- Local reminders through `expo-notifications`.
- QR booking pass with copy/check-in flow.
