import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import NoticeFormClient from '@/features/community/components/NoticeFormClient';
import { getNoticeDetailData } from '@/shared/lib/api/server';
import { buildPublicMetadata } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

interface PageProps {
  params: Promise<{ noticeId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { noticeId } = await params;
  const notice = await getNoticeDetailData(noticeId);

  if (!notice) {
    return buildPublicMetadata({
      title: '공지사항 수정',
      description: '공지를 찾을 수 없습니다.',
      path: `/notice/${noticeId}/edit`,
      noIndex: true,
    });
  }

  return buildPublicMetadata({
    title: `${notice.title || '공지'} · 수정`,
    description: '공지사항을 수정합니다.',
    path: `/notice/${noticeId}/edit`,
    noIndex: true,
  });
}

export default async function NoticeEditPage({ params }: PageProps) {
  const { noticeId } = await params;
  const notice = await getNoticeDetailData(noticeId);

  if (!notice) {
    notFound();
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: '공지사항 수정',
    inLanguage: 'ko-KR',
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <NoticeFormClient mode="edit" noticeId={noticeId} initialNotice={notice} />
    </>
  );
}
