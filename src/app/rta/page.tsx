import type { Metadata } from 'next';
import RtaPageClient from '@/features/rta/components/RtaPageClient';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

export const metadata: Metadata = buildPublicMetadata({
  title: 'RTA 분석',
  description:
    '실레나 매치 목록, 등급 분포, 최근 경기 흐름을 바탕으로 현재 메타와 유저 전투 패턴을 빠르게 탐색할 수 있습니다.',
  path: '/rta',
  keywords: ['RTA 분석', '실레나', '실레나 전적', '서머너즈워 RTA'],
});

export default function RtaPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'RTA 분석',
    url: getAbsoluteUrl('/rta'),
    inLanguage: 'ko-KR',
    description:
      '실레나 매치 목록, 등급 분포, 최근 경기 흐름을 바탕으로 현재 메타와 유저 전투 패턴을 빠르게 탐색할 수 있습니다.',
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: 'RTA 분석', path: '/rta' },
  ]);

  return (
    <>
      <JsonLd data={[jsonLd, breadcrumbJsonLd]} />
      <RtaPageClient />
    </>
  );
}

