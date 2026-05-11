# Build client (need devDependencies for Vite build)
FROM node:20-alpine AS client
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
# Do not hide stderr: a failed `npm ci` was hard to diagnose on the server.
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY client/ ./
# Small VPS / CasaOS hosts sometimes OOM during Vite; raise heap for this step only.
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build

# Runtime
FROM node:20-alpine
WORKDIR /app
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev
COPY server/ ./
RUN mkdir -p /app/data
COPY --from=client /app/client/dist ./client/dist
ENV NODE_ENV=production
ENV PORT=3080
ENV DATA_DIR=/app/data
ENV PUBLIC_DIR=/app/client/dist
EXPOSE 3080
CMD ["node", "src/index.js"]
