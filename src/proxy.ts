import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/** `/rta/monster-stats/solo|duo|trio`·사이트맵과 구분 — 리다이렉트하지 않음 */
const MONSTER_STATS_INDEX_SEGMENTS = new Set(['solo', 'duo', 'trio', 'sitemap.xml']);

const RTA_MONSTER_STATS_PREFIX = '/rta/monster-stats/';

/**
 * Next.js Proxy (middleware 대체)
 * - 예전 RTA 몬스터 상세 URL → `/monster-detail/{id}` 통합
 * - 그 외 요청은 그대로 통과
 */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith(RTA_MONSTER_STATS_PREFIX)) {
    const rest = pathname.slice(RTA_MONSTER_STATS_PREFIX.length);
    const segment = rest.split('/')[0] ?? '';
    if (
      segment &&
      !MONSTER_STATS_INDEX_SEGMENTS.has(segment) &&
      !rest.includes('/')
    ) {
      const url = request.nextUrl.clone();
      url.pathname = `/monster-detail/${segment}`;
      return NextResponse.redirect(url, 308);
    }
  }
  return NextResponse.next();
}

/**
 * Proxy 실행 경로 (기본: 정적·이미지·api 제외 전부)
 */
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)',
  ],
};
