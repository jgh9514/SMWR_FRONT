import type { Metadata } from 'next';
import HomePageClient from '@/features/home/components/HomePageClient';
import { buildPublicMetadata, getAbsoluteUrl, SITE_TITLE_DEFAULT } from '@/shared/lib/seo';
import { PUBLIC_SITEMAP_STATIC_ROUTES } from '@/shared/lib/site-indexing';
import JsonLd from '@/shared/ui/seo/JsonLd';

/** 루트 레이아웃 `title.template`을 쓰지 않고 탭 제목을 전부 `SITE_TITLE_DEFAULT`로 고정 */
export const metadata: Metadata = {
  ...buildPublicMetadata({
    title: SITE_TITLE_DEFAULT,
    description:
      '점령전, 실레나, 몬스터 검색, 전적 조회, 공지사항까지 한 곳에서 확인할 수 있는 서머너즈워 분석 포털입니다.',
    path: '/',
    keywords: ['홈', '서머너즈워 포털', '점령전 분석', 'RTA 분석'],
  }),
  title: { absolute: SITE_TITLE_DEFAULT },
};

export default function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_TITLE_DEFAULT,
    url: getAbsoluteUrl('/'),
    inLanguage: 'ko-KR',
    description:
      '점령전, 실레나, 몬스터 검색, 전적 조회, 공지사항까지 한 곳에서 확인할 수 있는 서머너즈워 분석 포털입니다.',
    hasPart: PUBLIC_SITEMAP_STATIC_ROUTES.filter((route) => route.path).map((route) => ({
      '@type': 'WebPage',
      name: route.name,
      url: getAbsoluteUrl(route.path),
    })),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <HomePageClient />
    </>
  );
}
