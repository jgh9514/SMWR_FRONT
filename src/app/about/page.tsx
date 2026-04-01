import type { Metadata } from 'next';
import AboutPageClient from '@/features/about/components/AboutPageClient';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

export const metadata: Metadata = buildPublicMetadata({
  title: '프로젝트 소개',
  description:
    '전투 로그 분석 시스템의 목적, 기술 스택, 주요 기능 영역을 포트폴리오·제출용으로 요약한 페이지입니다.',
  path: '/about',
  keywords: ['프로젝트 소개', '포트폴리오', '기술 스택', '서머너즈워'],
});

export default function AboutPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: '프로젝트 소개',
    url: getAbsoluteUrl('/about'),
    inLanguage: 'ko-KR',
    description:
      '전투 로그 분석 시스템의 목적, 기술 스택, 주요 기능 영역을 포트폴리오·제출용으로 요약한 페이지입니다.',
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: '프로젝트 소개', path: '/about' },
  ]);

  return (
    <>
      <JsonLd data={[jsonLd, breadcrumbJsonLd]} />
      <AboutPageClient />
    </>
  );
}
