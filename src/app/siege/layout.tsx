import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

export const metadata: Metadata = buildPublicMetadata({
  title: '점령전 덱 검색',
  description:
    '점령전 방어 덱 조합별 승률과 전투 기록을 빠르게 탐색하고, 자주 등장하는 조합과 추천 공략 흐름을 확인할 수 있습니다.',
  path: '/siege',
  keywords: ['점령전 덱 검색', '방어 덱', '공략 덱', '승률 분석'],
});

const siegeCollectionJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: '점령전 덱 검색',
  url: getAbsoluteUrl('/siege'),
  inLanguage: 'ko-KR',
  description:
    '점령전 방어 덱 조합별 승률과 전투 기록을 빠르게 탐색하고, 자주 등장하는 조합과 추천 공략 흐름을 확인할 수 있습니다.',
};

const siegeBreadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: '홈', path: '/' },
  { name: '점령전 덱 검색', path: '/siege' },
]);

export default function SiegeLayout({
  children,
  detail,
}: {
  children: ReactNode;
  detail: ReactNode;
}) {
  return (
    <>
      <JsonLd data={[siegeCollectionJsonLd, siegeBreadcrumbJsonLd]} />
      {children}
      {detail}
    </>
  );
}

