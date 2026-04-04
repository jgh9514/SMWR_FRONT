import type { Metadata } from 'next';
import RtaMonsterStatsClient from '@/features/rta/components/RtaMonsterStatsClient';
import { getRtaMonsterStatsData } from '@/shared/lib/api/server';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

const TOP_MONSTERS_LIMIT = 100;

export const revalidate = 600;

export const metadata: Metadata = buildPublicMetadata({
  title: 'RTA 몬스터 통계',
  description:
    '실레나 메타에서 각 몬스터의 픽률, 승률, 선픽율, 벤율을 비교해 현재 강세 픽과 핵심 메타 흐름을 한눈에 확인할 수 있습니다.',
  path: '/rta/monster-stats',
  keywords: ['RTA 몬스터 통계', '픽률', '승률', '벤율', '실레나 메타'],
});

export default async function RtaMonsterStatsPage() {
  const data = await getRtaMonsterStatsData(TOP_MONSTERS_LIMIT, 0).catch(() => ({
    stats: [],
    duo_stats: [],
    trio_stats: [],
    total_matches: 0,
  }));
  const stats = data.stats ?? [];
  const duoStats = data.duo_stats ?? [];
  const trioStats = data.trio_stats ?? [];
  const totalMatches = data.total_matches ?? 0;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'RTA 몬스터 통계',
    url: getAbsoluteUrl('/rta/monster-stats'),
    inLanguage: 'ko-KR',
    description:
      '실레나 메타에서 각 몬스터의 픽률, 승률, 선픽율, 벤율을 비교해 현재 강세 픽과 핵심 메타 흐름을 한눈에 확인할 수 있습니다.',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: stats.length,
    },
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: 'RTA 분석', path: '/rta' },
    { name: 'RTA 몬스터 통계', path: '/rta/monster-stats' },
  ]);

  return (
    <>
      <JsonLd data={[jsonLd, breadcrumbJsonLd]} />
      <RtaMonsterStatsClient
        stats={stats}
        duoStats={duoStats}
        trioStats={trioStats}
        totalMatches={totalMatches}
      />
    </>
  );
}

