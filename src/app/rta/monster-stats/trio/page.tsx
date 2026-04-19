import type { Metadata } from 'next';
import RtaMonsterStatsClient from '@/features/rta/components/RtaMonsterStatsClient';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildPublicMetadata({
  title: 'RTA 트리오 조합 통계',
  description: '실레나 메타에서 3마리 필드 조합의 픽률, 승률을 확인합니다.',
  path: '/rta/monster-stats/trio',
  keywords: ['RTA 트리오 통계', '3마리 조합', '실레나 메타'],
});

export default function RtaMonsterStatsTrioPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: 'RTA 분석', path: '/rta' },
    { name: 'RTA 트리오 조합 통계', path: '/rta/monster-stats/trio' },
  ]);
  return (
    <>
      <JsonLd data={[breadcrumbJsonLd]} />
      <RtaMonsterStatsClient />
    </>
  );
}
