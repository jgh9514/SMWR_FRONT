import type { MetadataRoute } from 'next';
import { getPwaIconCacheQuery } from '@/shared/lib/pwa-icon-version';

export default function manifest(): MetadataRoute.Manifest {
  const q = getPwaIconCacheQuery();
  return {
    name: '전투 로그 분석 시스템',
    short_name: 'SMWR',
    description:
      '점령전, 실레나, 몬스터 정보를 빠르게 탐색하고 분석할 수 있는 서머너즈워 데이터 플랫폼',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#1a1a2e',
    theme_color: '#16213e',
    orientation: 'portrait-primary',
    icons: [
      {
        src: `/icons/192.png${q}`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `/icons/512.png${q}`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `/icons/512.png${q}`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
