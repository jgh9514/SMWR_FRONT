import type { Metadata } from 'next';
import GuildRecruitmentFormClient from '@/features/guild-recruitment/components/GuildRecruitmentFormClient';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

export const metadata: Metadata = buildPublicMetadata({
  title: '길드원 모집 작성',
  description: '길드원 모집 글을 작성합니다.',
  path: '/guild-recruitment/write',
  keywords: ['길드원 모집', '작성'],
});

export default function GuildRecruitmentWritePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: '길드원 모집 작성',
    url: getAbsoluteUrl('/guild-recruitment/write'),
    inLanguage: 'ko-KR',
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: '길드원 모집', path: '/guild-recruitment' },
    { name: '작성', path: '/guild-recruitment/write' },
  ]);

  return (
    <>
      <JsonLd data={[jsonLd, breadcrumbJsonLd]} />
      <GuildRecruitmentFormClient />
    </>
  );
}
