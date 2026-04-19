export const PUBLIC_SITEMAP_STATIC_ROUTES = [
  { path: '', name: '홈', changeFrequency: 'daily' as const, priority: 1 },
  { path: '/dashboard', name: 'RTA 대시보드', changeFrequency: 'daily' as const, priority: 0.95 },
  { path: '/monster-search', name: '몬스터 검색', changeFrequency: 'weekly' as const, priority: 0.8 },
  { path: '/rta', name: 'RTA 분석', changeFrequency: 'daily' as const, priority: 0.9 },
  { path: '/rta/monster-stats', name: 'RTA 몬스터 통계', changeFrequency: 'daily' as const, priority: 0.9 },
  { path: '/rta/rank-cutoffs', name: 'RTA 랭크 컷', changeFrequency: 'daily' as const, priority: 0.8 },
  { path: '/rta/summoner-ranking', name: 'RTA 소환사 랭킹', changeFrequency: 'daily' as const, priority: 0.82 },
  { path: '/battle-history', name: '전적 조회', changeFrequency: 'daily' as const, priority: 0.8 },
  { path: '/siege', name: '점령전 덱 검색', changeFrequency: 'daily' as const, priority: 0.85 },
  { path: '/notice', name: '공지사항', changeFrequency: 'daily' as const, priority: 0.8 },
] as const;

export const PRIVATE_DISALLOW_PATHS = [
  '/admin/',
  '/login',
  '/signup',
  '/settings',
  '/guild-application',
  '/guild-management',
  '/account-summary',
  '/log-upload',
  '/inquiry',
  '/recent-siege',
  '/siege/siege-detail/',
] as const;
