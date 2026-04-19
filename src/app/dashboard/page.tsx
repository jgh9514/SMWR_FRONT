import type { Metadata } from 'next';
import HomePageClient from '@/features/home/components/HomePageClient';
import { buildPublicMetadata, getAbsoluteUrl, SITE_TITLE_DEFAULT } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

export const metadata: Metadata = {
  ...buildPublicMetadata({
    title: `RTA 대시보드 | ${SITE_TITLE_DEFAULT}`,
    description: '소환사 티어별 분포와 랭크 컷을 확인할 수 있습니다.',
    path: '/dashboard',
    keywords: ['RTA', '티어 분포', '랭크 컷', '대시보드'],
  }),
};

export default function DashboardPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `RTA 대시보드 — ${SITE_TITLE_DEFAULT}`,
    url: getAbsoluteUrl('/dashboard'),
    inLanguage: 'ko-KR',
    description: '소환사 티어별 분포와 랭크 컷을 확인할 수 있습니다.',
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <HomePageClient />
    </>
  );
}
