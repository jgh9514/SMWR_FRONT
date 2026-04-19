import type { Metadata } from 'next';
import RtaMonsterStatsClient from '@/features/rta/components/RtaMonsterStatsClient';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildPublicMetadata({
  title: 'RTA 솔로 몬스터 통계',
  description: '실레나 메타에서 몬스터 1마리 기준 픽률, 승률을 확인합니다.',
  path: '/rta/monster-stats/solo',
  keywords: ['RTA 솔로 통계', '픽률', '승률', '실레나 메타'],
});

export default function RtaMonsterStatsSoloPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: 'RTA 분석', path: '/rta' },
    { name: 'RTA 몬스터 통계', path: '/rta/monster-stats/solo' },
  ]);
  return (
    <>
      <JsonLd data={[breadcrumbJsonLd]} />
      <RtaMonsterStatsClient />
    </>
  );
}
