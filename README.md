# Focus list

A personal task app for one user, on phone and computer. Tasks belong to projects. Priority changes by itself from the deadline:

- **High**: overdue, today or tomorrow (pinned tasks are always High)
- **Medium**: 2-3 days left
- **Low**: 4+ days left

Stack: React 18 + TypeScript + Vite, Zustand, Express API, MongoDB.

## Project structure

```
src/            React app
  domain/       priority rules (pure functions + tests), dates, types
  components/   UI parts (task row, dialogs, accordion, ...)
  pages/        Main page and Projects page
  store.ts      app state, saves through the API
  api.ts        calls to the server
server/         Express API + MongoDB, serves the built app in production
prototype/      approved HTML design
```

## Run on your computer (development)

You need **Node.js 22+** and **MongoDB** running locally.

1. Install packages:
   ```bash
   npm install
   ```
2. Create your settings file:
   ```bash
   cp .env.example .env.local
   ```
   Check `MONGODB_URI` (default `mongodb://127.0.0.1:27017`).
3. Start the app and the API together:
   ```bash
   npm run dev
   ```
4. Open http://localhost:5173

The app starts empty. Create a project, then add tasks.

## Settings (`.env.local`)

| Name | Default | Meaning |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017` | MongoDB address |
| `MONGODB_DB` | `focus-list` | Database name |
| `API_PORT` | `3001` | Server port |
| `HOST` | `127.0.0.1` | `0.0.0.0` = other devices on your network can connect |
| `APP_USER` | `me` | Login name |
| `APP_PASSWORD` | empty | Password. Empty = no login (only for your own computer) |

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | App (port 5173) + API (port 3001), reload on change |
| `npm test` | Unit tests (Vitest) |
| `npm run test:coverage` | Tests + coverage (`priority.ts` must be 100%) |
| `npm run build` | Production build into `dist/` |
| `npm start` | Start the server (serves `dist/` + API on one port) |
| `npm run serve` | Build, then start |

## Run on your home network (without Docker)

1. In `.env.local` set `HOST=0.0.0.0`.
2. Run:
   ```bash
   npm run serve
   ```
3. Open `http://<this-computer-ip>:3001` on your phone or another computer on the same Wi-Fi. On macOS, allow incoming connections for Node if asked.

## Deploy on a home server with Docker

Two containers: `app` (React app + API) and `mongo` (database). Optional third: `caddy` (HTTPS).

### 1. Prepare the server

Install Docker and the Docker Compose plugin. Copy this project to the server (without `node_modules`, `dist`, `.env.local`).

### 2. Settings

```bash
cp .env.docker.example .env
```

Edit `.env`:
- `APP_PASSWORD`: a long password. **Required.** The app does not start without it.
- `APP_USER`: login name (default `me`).
- `APP_PORT`: port for plain HTTP (default `3001`).
- `DOMAIN`: only for HTTPS (step 4).

### 3. Start with HTTP

```bash
docker compose up -d --build
```

Open `http://<server-ip>:3001`. The browser asks for the user name and password.

### 4. Start with HTTPS (recommended on the internet)

Without HTTPS, the password travels as plain text. With a domain:

1. Point the domain (DNS A record) to your public IP.
2. In the router, forward ports **80** and **443** to the server. Do not forward 3001.
3. Set `DOMAIN` in `.env`, then:
   ```bash
   docker compose --profile https up -d --build
   ```

Caddy gets a free certificate by itself. Open `https://<your-domain>`.

Tip: set `APP_PORT=127.0.0.1:3001` in `.env`, so the app is reachable only through Caddy.

### Docker commands

| Command | What it does |
| --- | --- |
| `docker compose logs -f app` | Show app logs |
| `docker compose up -d --build` | Update after code changes |
| `docker compose down` | Stop (data stays in the `mongo-data` volume) |
| `docker compose exec mongo mongodump --archive > backup.archive` | Backup |
| `docker compose exec -T mongo mongorestore --archive < backup.archive` | Restore |

**Warning:** never run `docker compose down -v`. `-v` deletes the database.

### Move your local data to the server

On your computer:
```bash
mongodump --db focus-list --archive > focus-list.archive
```
Copy `focus-list.archive` to the server, then:
```bash
docker compose exec -T mongo mongorestore --archive < focus-list.archive
```

## Security notes

- Always set `APP_PASSWORD` when the app is reachable from the internet.
- Use HTTPS (Caddy) on the internet.
- MongoDB is not exposed outside Docker. Keep it that way.
