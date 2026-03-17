import { buildBreadcrumbJsonLd, getAbsoluteUrl, serializeJsonLd } from '@/shared/lib/seo';

export default function Head() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '점령전 덱 검색',
    url: getAbsoluteUrl('/siege'),
    inLanguage: 'ko-KR',
    description:
      '점령전 방어 덱 조합별 승률과 전투 기록을 빠르게 탐색하고, 자주 등장하는 조합과 추천 공략 흐름을 확인할 수 있습니다.',
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: '점령전 덱 검색', path: '/siege' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd([jsonLd, breadcrumbJsonLd]),
        }}
      />
    </>
  );
}
