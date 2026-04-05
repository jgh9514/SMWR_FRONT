import type { Metadata } from 'next';
import AboutPageClient from '@/features/about/components/AboutPageClient';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

export const metadata: Metadata = buildPublicMetadata({
  title: '서비스 소개',
  description:
    'SKYARENA에서 제공하는 RTA·점령전·몬스터 검색·커뮤니티·로그 업로드 등 주요 기능과 바로가기를 안내합니다.',
  path: '/about',
  keywords: ['서비스 소개', 'RTA', '점령전', '몬스터 검색', '서머너즈워'],
});

export default function AboutPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: '서비스 소개',
    url: getAbsoluteUrl('/about'),
    inLanguage: 'ko-KR',
    description:
      '이 사이트에서 제공하는 RTA·점령전·몬스터·커뮤니티·데이터 기능을 영역별로 안내합니다.',
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: '서비스 소개', path: '/about' },
  ]);

  return (
    <>
      <JsonLd data={[jsonLd, breadcrumbJsonLd]} />
      <AboutPageClient />
    </>
  );
}
