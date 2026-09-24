# VKU Reserve — Mini Project 2

Responsive PWA for discovering and reserving VKU computer labs and study rooms.

## Stack

- React + TypeScript + Vite
- Express + PostgreSQL
- Zustand persistence for the client session/cache
- Google Identity Services + verified backend JWT session
- QR booking passes and Web Notifications
- Render Blueprint deployment

## Local setup

Install dependencies:

```bash
npm install
```

Create `.env` from `.env.example` and configure PostgreSQL. The API creates the `users`, `rooms`, and `bookings` tables and seeds rooms on first startup.

For local PostgreSQL, `DATABASE_URL` must use the real password of your local `postgres` user. The app creates tables automatically, but it does not create or reset your PostgreSQL login password.

Quick local database option with Docker:

```bash
docker compose up -d postgres
```

This starts a local database that matches:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5433/vku_booking
DATABASE_SSL=false
```

If you see `password authentication failed for user "postgres"`, your `.env` password is not the password of the PostgreSQL server currently listening on that port. This project uses Docker port `5433` to avoid conflicting with an existing local PostgreSQL service on `5432`.

Start frontend and API together:

```bash
npm run dev:all
```

Open `http://127.0.0.1:5173`.

## Expo React Native mobile app

The native mobile client lives in `mobile/` and uses the same Express API.

Run with Expo Go:

```bash
cd mobile
npm install
cp .env.example .env
npm start
```

Set the mobile API URL in `mobile/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-render-service.onrender.com/api
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
```

For Android emulator local testing, the mobile app defaults to `http://10.0.2.2:3001/api`. For a physical phone, use the Render URL or your computer LAN IP.

To enable Google registration/login locally:

1. Create a Web OAuth client in Google Cloud Console.
2. Add `http://127.0.0.1:5173` to Authorized JavaScript origins.
3. Set the same client ID in both `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`.

Google Identity Services sends an ID token to the Express API. The API verifies it against the configured client ID, creates the user on first sign-in, and returns a short-lived application JWT. Google passwords are never handled by this project.

## API

```text
GET  /api/health
POST /api/auth/google
GET  /api/auth/me
PUT  /api/auth/profile
GET  /api/rooms
GET  /api/rooms/:id/availability?date=YYYY-MM-DD
GET  /api/bookings
POST /api/bookings
DELETE /api/bookings/:id
POST /api/bookings/:id/check-in
```

Booking dates are limited to today plus the next six days. The server uses a transaction-safe unique constraint to prevent two users reserving the same room and slot.

## Render deployment

Push this folder to a public GitHub repository, then choose **New → Blueprint** in Render. The included `render.yaml` creates one Node Web Service and one PostgreSQL database.

Set `GOOGLE_CLIENT_ID` in Render to the Google Web OAuth client ID. Add the deployed Render URL to the client's Authorized JavaScript origins, for example:

```text
https://vku-room-booking.onrender.com
```

`VITE_GOOGLE_CLIENT_ID` is not required at runtime on Render because the server serves the already-built frontend; the build should receive it if you want the Google button rendered. For Render, add it as a build-time environment variable with the same value as `GOOGLE_CLIENT_ID`.

Check deployment with:

```text
https://<your-service>.onrender.com/api/health
```

## Build verification

```bash
npm run build
```

The PDF technical report is intentionally not included in this version.
