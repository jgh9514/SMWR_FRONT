import type { Metadata } from 'next';
import RtaRankCutoffsPageClient from '@/features/rta/components/RtaRankCutoffsPageClient';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

export const metadata: Metadata = buildPublicMetadata({
  title: 'RTA 랭크 컷 기록',
  description:
    '레전드·수호자·심판자(L·G·P) 구간별 일자별 최저 점수 추정(리플레이 기준)과 앵커 대비 변화를 확인할 수 있습니다.',
  path: '/rta/rank-cutoffs',
  keywords: ['RTA', '랭크 컷', '레전드', '수호자', '심판자', '점수'],
});

export default function RtaRankCutoffsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'RTA 랭크 컷 기록',
    url: getAbsoluteUrl('/rta/rank-cutoffs'),
    inLanguage: 'ko-KR',
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: 'RTA 분석', path: '/rta' },
    { name: 'RTA 대시보드', path: '/rta/dashboard' },
    { name: '랭크 컷 기록', path: '/rta/rank-cutoffs' },
  ]);

  return (
    <>
      <JsonLd data={[jsonLd, breadcrumbJsonLd]} />
      <RtaRankCutoffsPageClient />
    </>
  );
}
