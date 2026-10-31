# Logo Legends — multiplayer car-logo buzzer game

A runnable MVP for 2–8 players, 10 expert rounds, real-time rooms, and server-authoritative buzzer locking.

## Stack
- Next.js frontend (`web/`)
- Node.js + Express + Socket.IO backend (`server/`)
- In-memory rooms (rooms reset when the server restarts)

## Requirements
Node.js 20+

## Run locally
1. Start the backend:
   ```bash
   cd server
   npm install
   npm run dev
   ```
2. In another terminal, start the frontend:
   ```bash
   cd web
   npm install
   npm run dev
   ```
3. Open `http://localhost:3000`. Create a room, then join from other devices using the room code and the host machine's LAN IP (or deploy the app).

Set `NEXT_PUBLIC_SOCKET_URL` in `web/.env.local` to your backend URL. For local use, default is `http://localhost:4000`.

## Deploy
- Deploy `server/` as a Node web service on Render. Set `PORT` if required.
- Deploy `web/` on Vercel. Add `NEXT_PUBLIC_SOCKET_URL=https://YOUR-RENDER-SERVICE.onrender.com`.
- Configure the Render service's `CLIENT_ORIGIN` to your Vercel URL.
- Use HTTPS URLs in production.

This is a complete playable starter, not a production-hardened service. Rooms are memory-only; add persistent storage, rate limits, reconnection recovery, and moderation before public launch.
