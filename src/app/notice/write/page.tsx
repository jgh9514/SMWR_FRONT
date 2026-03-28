import type { Metadata } from 'next';
import NoticeFormClient from '@/features/community/components/NoticeFormClient';
import { buildPublicMetadata } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

export const metadata: Metadata = buildPublicMetadata({
  title: '공지사항 작성',
  description: '운영 공지를 작성합니다.',
  path: '/notice/write',
  keywords: ['공지사항', '작성'],
  noIndex: true,
});

export default function NoticeWritePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: '공지사항 작성',
    inLanguage: 'ko-KR',
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <NoticeFormClient mode="create" />
    </>
  );
}
