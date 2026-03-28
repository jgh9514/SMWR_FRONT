# Next.js app Dockerfile for Yarn Berry + node-modules (Turbopack)
# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.10.3 --activate

COPY package.json yarn.lock .yarnrc.yml ./
# postinstall: node scripts/copy-smarteditor.mjs (deps 단계에는 소스가 일부만 있음)
COPY scripts/copy-smarteditor.mjs scripts/copy-smarteditor.mjs
RUN mkdir -p public
RUN yarn install --immutable

FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA=true

RUN corepack enable && corepack prepare yarn@4.10.3 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/yarn.lock ./yarn.lock
COPY --from=deps /app/.yarnrc.yml ./.yarnrc.yml
COPY . .

# BuildKit 캐시: next build 출력 캐시
RUN --mount=type=cache,target=/app/.next/cache \
    yarn build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
