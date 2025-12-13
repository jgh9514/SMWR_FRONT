# Next.js 앱을 위한 Dockerfile
# Multi-stage build를 사용하여 최적화된 이미지 생성

# Stage 1: 의존성 설치
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# pnpm 설치
RUN corepack enable && corepack prepare pnpm@latest --activate

# 의존성 파일 복사 및 설치
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 2: 빌드
FROM node:20-alpine AS builder
WORKDIR /app

# pnpm 설치
RUN corepack enable && corepack prepare pnpm@latest --activate

# 의존성 및 소스 코드 복사
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 환경 변수 설정 (필요시)
ENV NEXT_TELEMETRY_DISABLED 1

# Next.js 빌드
RUN pnpm build

# Stage 3: 실행
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# 시스템 사용자 생성 (보안)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# standalone 빌드 결과 복사
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]

