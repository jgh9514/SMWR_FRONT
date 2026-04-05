import type { Metadata } from 'next';
import SiegeDashboardClient from '@/features/siege/components/SiegeDashboardClient';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

export const metadata: Metadata = buildPublicMetadata({
  title: '점령전 대시보드',
  description: '전체 점령전, 최근 점령전, 전적 조회, 길드원 모집 등 점령전 관련 기능으로 이동할 수 있습니다.',
  path: '/siege/dashboard',
  keywords: ['점령전', '대시보드', '길드원 모집', '전적'],
});

export default function SiegeDashboardPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: '점령전 대시보드',
    url: getAbsoluteUrl('/siege/dashboard'),
    inLanguage: 'ko-KR',
    description: '점령전 관련 메뉴 바로가기',
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: '점령전 대시보드', path: '/siege/dashboard' },
  ]);

  return (
    <>
      <JsonLd data={[jsonLd, breadcrumbJsonLd]} />
      <SiegeDashboardClient />
    </>
  );
}
