import type { Metadata } from 'next';
import RtaSimulationRecommendClient from '@/features/rta/components/RtaSimulationRecommendClient';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

export const metadata: Metadata = buildPublicMetadata({
  title: 'RTA 시뮬레이션 추천',
  description:
    '선/후픽과 현재 픽 조합을 기준으로 다음 추천 픽을 계산해 드립니다. 시즌·티어별 통계와 시너지/카운터 지표를 함께 반영합니다.',
  path: '/rta/simulation-recommend',
  keywords: ['RTA', '실레나', '픽 시뮬레이션', '픽 추천', '서머너즈워'],
});

export default function RtaSimulationRecommendPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'RTA 시뮬레이션 추천',
    url: getAbsoluteUrl('/rta/simulation-recommend'),
    inLanguage: 'ko-KR',
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: 'RTA 분석', path: '/rta' },
    { name: '시뮬레이션 추천', path: '/rta/simulation-recommend' },
  ]);

  return (
    <>
      <JsonLd data={[jsonLd, breadcrumbJsonLd]} />
      <RtaSimulationRecommendClient />
    </>
  );
}
