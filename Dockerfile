# Next.js app Dockerfile for Yarn Berry PnP

FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV YARN_CACHE_FOLDER=/app/.yarn/cache
ENV YARN_VIRTUAL_FOLDER=/app/.yarn/__virtual__
ENV YARN_PNP_UNPLUGGED_FOLDER=/app/.yarn/unplugged

RUN corepack enable && corepack prepare yarn@4.10.3 --activate

COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable

FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV YARN_CACHE_FOLDER=/app/.yarn/cache
ENV YARN_VIRTUAL_FOLDER=/app/.yarn/__virtual__
ENV YARN_PNP_UNPLUGGED_FOLDER=/app/.yarn/unplugged

RUN corepack enable && corepack prepare yarn@4.10.3 --activate

COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/yarn.lock ./yarn.lock
COPY --from=deps /app/.yarnrc.yml ./.yarnrc.yml
COPY --from=deps /app/.yarn ./.yarn
COPY --from=deps /app/.pnp.cjs ./.pnp.cjs
COPY --from=deps /app/.pnp.loader.mjs ./.pnp.loader.mjs
COPY . .

RUN yarn build

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
COPY --from=builder --chown=nextjs:nodejs /app/.yarn ./.yarn
COPY --from=builder --chown=nextjs:nodejs /app/.pnp.cjs ./.pnp.cjs
COPY --from=builder --chown=nextjs:nodejs /app/.pnp.loader.mjs ./.pnp.loader.mjs

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]

