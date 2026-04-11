import type { Metadata } from 'next';
import RtaMonsterStatsClient from '@/features/rta/components/RtaMonsterStatsClient';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

/** POST 기반 통계는 fetch Data Cache·ISR 조합에서 갱신이 멈추는 경우가 있어 매 요청 서버에서 최신 데이터를 가져온다. */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildPublicMetadata({
  title: 'RTA 몬스터 통계',
  description:
    '실레나 메타에서 각 몬스터의 픽률, 승률, 선픽율, 벤율을 비교해 현재 강세 픽과 핵심 메타 흐름을 한눈에 확인할 수 있습니다.',
  path: '/rta/monster-stats',
  keywords: ['RTA 몬스터 통계', '픽률', '승률', '벤율', '실레나 메타'],
});

export default function RtaMonsterStatsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'RTA 몬스터 통계',
    url: getAbsoluteUrl('/rta/monster-stats'),
    inLanguage: 'ko-KR',
    description:
      '실레나 메타에서 각 몬스터의 픽률, 승률, 선픽율, 벤율을 비교해 현재 강세 픽과 핵심 메타 흐름을 한눈에 확인할 수 있습니다.',
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: 'RTA 분석', path: '/rta' },
    { name: 'RTA 몬스터 통계', path: '/rta/monster-stats' },
  ]);

  return (
    <>
      <JsonLd data={[jsonLd, breadcrumbJsonLd]} />
      <RtaMonsterStatsClient />
    </>
  );
}
