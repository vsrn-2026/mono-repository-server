# ── Stage 1: Base ────────────────────────────────────────────────────────────
FROM node:25.8.0-alpine AS base

WORKDIR /app

# Install build tools for native modules
RUN apk add --no-cache python3 make g++ openssl libc6-compat

# Copy package files
COPY package*.json ./

# Copy Prisma schema early for dependency triggers
COPY prisma ./prisma

# ── Stage 2: Dev Dependencies ─────────────────────────────────────────────────
FROM base AS deps

RUN npm ci

# ── Stage 3: Build ────────────────────────────────────────────────────────────
FROM deps AS build

# Copy Prisma schema
COPY prisma ./prisma

# Copy source and config files
COPY tsconfig.json ./
COPY tsoa.json ./
COPY src ./src

# Build the application
RUN npm run tsoa:build
RUN npm run build

# ── Stage 4: Development ──────────────────────────────────────────────────────
FROM deps AS development

WORKDIR /app

ENV NODE_ENV=development

# Copy files in layers to preserve cache where possible
COPY tsconfig.json tsoa.json ./
COPY src ./src

EXPOSE 8080

CMD ["npm", "run", "dev"]

# ── Stage 5: Production ───────────────────────────────────────────────────────
FROM node:25.8.0-alpine AS production

WORKDIR /app

# Install runtime tools needed for health checks
RUN apk add --no-cache wget openssl

# Arguments for versioning metadata
ARG COMMIT_HASH=dev
ARG BUILD_TIME=unknown

# Set environment to production and inject metadata
ENV NODE_ENV=production \
    COMMIT_HASH=$COMMIT_HASH \
    BUILD_TIME=$BUILD_TIME

# Expose build metadata via image labels
LABEL org.opencontainers.image.revision=$COMMIT_HASH \
      org.opencontainers.image.created=$BUILD_TIME

# Copy package files for reference
COPY package*.json ./

# Reuse already-installed node_modules from deps stage, then prune dev deps
COPY --from=deps /app/node_modules ./node_modules
RUN npm prune --omit=dev

# Copy pre-generated Prisma client from build stage instead of regenerating
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy Prisma schema
COPY prisma ./prisma

# Copy built assets from build stage
COPY --from=build /app/dist ./dist

RUN mkdir logs && chown node:node logs

USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8080}/health || exit 1

CMD ["node", "dist/server.js"]