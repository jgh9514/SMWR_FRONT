import type { Metadata } from 'next';
import GuildRecruitmentDetailClient from '@/features/guild-recruitment/components/GuildRecruitmentDetailClient';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

interface Props {
  params: Promise<{ postId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { postId } = await params;
  return buildPublicMetadata({
    title: '길드원 모집',
    description: '길드원 모집 상세',
    path: `/guild-recruitment/${postId}`,
    keywords: ['길드원 모집'],
  });
}

export default async function GuildRecruitmentDetailPage({ params }: Props) {
  const { postId } = await params;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: '길드원 모집',
    url: getAbsoluteUrl(`/guild-recruitment/${postId}`),
    inLanguage: 'ko-KR',
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: '길드원 모집', path: '/guild-recruitment' },
    { name: '상세', path: `/guild-recruitment/${postId}` },
  ]);

  return (
    <>
      <JsonLd data={[jsonLd, breadcrumbJsonLd]} />
      <GuildRecruitmentDetailClient postId={postId} />
    </>
  );
}
