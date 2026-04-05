import type { Metadata } from 'next';
import GuildRecruitmentFormClient from '@/features/guild-recruitment/components/GuildRecruitmentFormClient';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

interface Props {
  params: Promise<{ postId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { postId } = await params;
  return buildPublicMetadata({
    title: '길드원 모집 수정',
    description: '길드원 모집 글을 수정합니다.',
    path: `/guild-recruitment/${postId}/edit`,
    keywords: ['길드원 모집', '수정'],
  });
}

export default async function GuildRecruitmentEditPage({ params }: Props) {
  const { postId } = await params;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: '길드원 모집 수정',
    url: getAbsoluteUrl(`/guild-recruitment/${postId}/edit`),
    inLanguage: 'ko-KR',
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: '길드원 모집', path: '/guild-recruitment' },
    { name: '수정', path: `/guild-recruitment/${postId}/edit` },
  ]);

  return (
    <>
      <JsonLd data={[jsonLd, breadcrumbJsonLd]} />
      <GuildRecruitmentFormClient postId={postId} />
    </>
  );
}
