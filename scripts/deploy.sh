#!/usr/bin/env sh
# Run on the server after: git pull
# Rebuilds the Docker image and recreates the container. Database stays in the volume.
set -e
cd "$(dirname "$0")/.."
docker compose up -d --build
