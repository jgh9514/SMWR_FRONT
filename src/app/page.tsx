import type { Metadata } from 'next';
import HomePageClient from '@/features/home/components/HomePageClient';
import { buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import { PUBLIC_SITEMAP_STATIC_ROUTES } from '@/shared/lib/site-indexing';
import JsonLd from '@/shared/ui/seo/JsonLd';

export const metadata: Metadata = buildPublicMetadata({
  title: '홈',
  description:
    '점령전, 실레나, 몬스터 검색, 전적 조회, 공지사항까지 한 곳에서 확인할 수 있는 서머너즈워 분석 포털입니다.',
  path: '/',
  keywords: ['홈', '서머너즈워 포털', '점령전 분석', 'RTA 분석'],
});

export default function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '전투 로그 분석 시스템',
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
