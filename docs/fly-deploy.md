# Deploy on Fly.io

Prerequisites: [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/), Fly account, repo root with the [`Dockerfile`](../Dockerfile).

## 1. App name

Edit [`fly.toml`](../fly.toml): set `app = "your-unique-app-name"` to match the Fly app you create (or that GitHub integration created).

## 2. Region and volume

Pick a [region](https://fly.io/docs/reference/regions/) near you and set `primary_region` in `fly.toml`.

Create a **volume** (once) with the **same name** as `[mounts].source` (`festos_data` by default) and the **same region**:

```bash
fly volumes create festos_data --region sjc --size 3
```

If `fly deploy` creates the volume for you, `initial_size` in `fly.toml` under `[mounts]` is used on first launch; otherwise create the volume manually before deploy.

## 3. Secrets (not in Git)

This app uses a shared login password (see server `routes/auth.js`). Set at least:

```bash
fly secrets set \
  PLANNER_PASSWORD="your-strong-password" \
  PLANNER_SESSION_SECRET="a-long-random-string" \
  PLANNER_COOKIE_SECURE="true"
```

`PLANNER_COOKIE_SECURE=true` matches Fly’s HTTPS. Omit or set `false` only for unusual HTTP-only setups.

## Health check

[`fly.toml`](../fly.toml) uses `GET /healthz` (implemented in the server). Do not point Fly checks at `/api/...` routes that require a session; they return 401 and the deploy verifier can fail or hang.

## Port (8080)

Fly’s HTTP proxy defaults to **`internal_port` 8080**. The Dockerfile and `[env] PORT` in `fly.toml` use **8080** so the proxy and Node agree. If they differ (e.g. app on 3080, proxy on 8080), the site can show **TLS OK but the page never loads** (no bytes from the origin). After changing ports, redeploy with `fly deploy`.

## Troubleshooting: site never loads

1. **`fly logs -a YOUR_APP`** — confirm `Bass Canyon Planner running at http://0.0.0.0:8080` (or your configured `PORT`).
2. **`fly status -a YOUR_APP`** — ensure at least one machine is `started`.
3. **`curl -m 10 https://YOUR_APP.fly.dev/healthz`** — should return `ok`.
4. Confirm **`internal_port`** in `fly.toml` matches **`PORT`** in `[env]` and what the process logs on startup.

## 4. Deploy

From repo root:

```bash
fly deploy
```

GitHub-linked apps typically deploy on push to the configured branch; the same `fly.toml` is used.

## 5. Custom domain

```bash
fly certs add yourdomain.com
```

Update Google OAuth origins and redirect URI to use `https://yourdomain.com`.

## 6. SQLite limits

Keep **one Machine** while using SQLite. Move to Postgres (and object storage for uploads) before running multiple stateful app instances with concurrent writes.
