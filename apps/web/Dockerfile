# syntax=docker.io/docker/dockerfile:1

FROM node:24-alpine AS base
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY . .

ENV NODE_TLS_REJECT_UNAUTHORIZED=0
ENV NODE_OPTIONS=--use-system-ca
ENV COREPACK_INTEGRITY_KEYS=0

RUN corepack enable pnpm
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm config set strict-ssl false && pnpm config set fetch-retries 10 && pnpm config set fetch-retry-mintimeout 20000 && pnpm config set fetch-retry-maxtimeout 120000 && pnpm config set network-concurrency 4 && pnpm i --frozen-lockfile

ARG NEXT_PUBLIC_DOCKER_BUILD=true
ENV NEXT_PUBLIC_WEB_URL=http://localhost:3000

RUN pnpm run build:web


# 3. Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001


# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/packages/database/migrations ./apps/web/migrations


USER nextjs

EXPOSE 3000

CMD HOSTNAME="0.0.0.0" node apps/web/server.js
