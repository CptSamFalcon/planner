# Bass Canyon 2026 — Group Planner

A self-hosted group planning app for **Bass Canyon 2026** (Aug 13–16, The Gorge Amphitheatre). Share who’s going, a packing list, schedule/meetups, and group notes. Designed to run on **CasaOS** or any Docker host.

## Features

- **Who’s going** — Add group members with status (going / maybe / not going) and notes (e.g. camp spot).
- **Packing list** — Shared checklist so nothing gets forgotten.
- **Schedule & meetups** — Add events and meetup times by day (Thursday pre-party through Sunday).
- **Group notes** — Camp location, meetup spots, announcements.

Data is stored in SQLite and persisted via a Docker volume.

## Run locally (dev)

```bash
# Install dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Start API and frontend (API on :3080, Vite on :5173 with proxy)
npm run dev
```

Open http://localhost:5173 (dev) or build and run the server only (see below).

## Build and run with Docker

```bash
docker compose up -d --build
```

Then open **http://localhost:3080** (or `http://<your-server-ip>:3080`).

## Deploy on CasaOS

**→ Full guide: [CASAOS.md](./CASAOS.md)**

1. In CasaOS, go to **App Store** or **Custom App**.
2. **Option A — Docker Compose**
   - Copy the contents of `docker-compose.yml` into a new Compose app.
   - Set your desired port (e.g. `3080:3080`).
   - Deploy; the image will build from the Dockerfile in this repo (or from a pre-built image if you push to a registry).
3. **Option B — Single container**
   - Build the image: `docker build -t bass-canyon-planner .`
   - In CasaOS “Install a customized app”, use image `bass-canyon-planner`, map port **3080**, and add a volume:
     - Container path: `/app/data`
     - So SQLite data persists across restarts.

After deployment, share the app URL with your group so everyone can view and edit the same plan.

## Tech

- **Backend:** Node.js, Express, SQLite (better-sqlite3)
- **Frontend:** React, Vite
- **Data:** Single SQLite file in `/app/data` (or `./data` when not in Docker)

## License

MIT
