# Quick fix on the server (run these on CasaOS server)

The Dockerfile on GitHub still has the old client install line. Either push the latest code from your dev machine to GitHub and pull, **or** fix it directly on the server:

## Option A: Fix Dockerfile on the server and rebuild (no cache)

```bash
cd /DATA/AppData/planner/planner

# Fix line 5 only (client stage): remove --omit=dev so Vite gets installed
sed -i '5s/ --omit=dev//g' Dockerfile

# Rebuild without using cache and start
docker compose build --no-cache
docker compose up -d
```

## Option B: Push from your dev machine, then on server

On your **dev machine** (where you have the fixed Dockerfile):
```bash
cd /path/to/planner
git push origin main
```

On the **server**:
```bash
cd /DATA/AppData/planner/planner
git pull
docker compose build --no-cache
docker compose up -d
```

Note: `--no-cache` is needed so Docker doesn't reuse the old cached layer that skipped devDependencies.
