import type { Metadata } from 'next';
import GuildRecruitmentListClient from '@/features/guild-recruitment/components/GuildRecruitmentListClient';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

export const metadata: Metadata = buildPublicMetadata({
  title: '길드원 모집',
  description: '길드명·서버·전시즌 등급·모집 내용을 올려 길드원을 모집할 수 있습니다.',
  path: '/guild-recruitment',
  keywords: ['길드원 모집', '길드', '점령전'],
});

export default function GuildRecruitmentPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '길드원 모집',
    url: getAbsoluteUrl('/guild-recruitment'),
    inLanguage: 'ko-KR',
    description: '길드원 모집 게시판',
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: '길드원 모집', path: '/guild-recruitment' },
  ]);

  return (
    <>
      <JsonLd data={[jsonLd, breadcrumbJsonLd]} />
      <GuildRecruitmentListClient />
    </>
  );
}
