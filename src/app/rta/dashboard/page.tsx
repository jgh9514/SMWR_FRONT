import type { Metadata } from 'next';
import RtaDashboardClient from '@/features/rta/components/RtaDashboardClient';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

export const metadata: Metadata = buildPublicMetadata({
  title: 'RTA 대시보드',
  description:
    '수집된 실레나 리플레이를 기준으로 소환사 티어(Ch·F·C·P·G) 분포와 기간별 추이를 한 화면에서 확인할 수 있습니다.',
  path: '/rta/dashboard',
  keywords: ['RTA 대시보드', '실레나', '티어 분포', '레이팅'],
});

export default function RtaDashboardPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'RTA 대시보드',
    url: getAbsoluteUrl('/rta/dashboard'),
    inLanguage: 'ko-KR',
    description:
      '수집된 실레나 리플레이를 기준으로 소환사 티어 분포와 기간 필터를 제공합니다.',
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: 'RTA 분석', path: '/rta' },
    { name: 'RTA 대시보드', path: '/rta/dashboard' },
  ]);

  return (
    <>
      <JsonLd data={[jsonLd, breadcrumbJsonLd]} />
      <RtaDashboardClient />
    </>
  );
}
