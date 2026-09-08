# Green Color Networks — production image for Railway / any Docker host.
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install all deps (prisma CLI is needed at runtime for migrate deploy)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Build
COPY . .
RUN npx prisma generate && npm run build

# Runtime
ENV NODE_ENV=production
ENV PORT=3000
# DATABASE_URL points at the persistent volume (/data) — set by the platform.
EXPOSE 3000
CMD ["node", "scripts/start.mjs"]
