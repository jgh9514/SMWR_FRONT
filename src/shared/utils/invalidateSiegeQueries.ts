import type { QueryClient } from '@tanstack/react-query';

const SIEGE_QUERY_PREFIXES = [
  '/summonerswar/enemyTeam-list',
  '/summonerswar/total-page-count',
  '/summonerswar/monster-detail',
  '/summonerswar/siege-list',
  '/summonerswar/recent-siege-list',
  '/summonerswar/guild-siege-history',
] as const;

/** 점령전 조회 범위·길드 설정 변경 후 목록·상세 캐시 무효화 */
export function invalidateSiegeQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey[0];
      if (typeof key !== 'string') return false;
      return SIEGE_QUERY_PREFIXES.some((prefix) => key.startsWith(prefix));
    },
  });
}
