import type { Metadata } from 'next';
import { Suspense } from 'react';
import BattleHistoryPageClient from '@/features/battle-history/components/BattleHistoryPageClient';
import { getSeasonListData } from '@/shared/lib/api/server';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

export const revalidate = 600;

export const metadata: Metadata = buildPublicMetadata({
  title: '전적 조회',
  description:
    '소환사별 시즌 전적, 승률, 승패 수를 기준으로 점령전 전투 기록을 빠르게 찾아보고 상세 로그까지 이어서 확인할 수 있습니다.',
  path: '/battle-history',
  keywords: ['전적 조회', '점령전 전적', '소환사 전적', '전투 로그 조회'],
});

export default async function BattleHistoryPage() {
  const seasonList = await getSeasonListData().catch(() => []);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '전적 조회',
    url: getAbsoluteUrl('/battle-history'),
    inLanguage: 'ko-KR',
    description:
      '소환사별 시즌 전적, 승률, 승패 수를 기준으로 점령전 전투 기록을 빠르게 찾아보고 상세 로그까지 이어서 확인할 수 있습니다.',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: 0,
    },
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: '전적 조회', path: '/battle-history' },
  ]);

  return (
    <>
      <JsonLd data={[jsonLd, breadcrumbJsonLd]} />
      <Suspense fallback={null}>
        <BattleHistoryPageClient initialSeasonList={seasonList} />
      </Suspense>
    </>
  );
}
