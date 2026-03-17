import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import NoticeDetailClient from '@/features/community/components/NoticeDetailClient';
import { getNoticeDetailData, getNoticeStaticListData } from '@/shared/lib/api/server';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl, sanitizeMetaDescription } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

export const revalidate = 300;
export const dynamicParams = true;

interface NoticeDetailPageProps {
  params: Promise<{ noticeId: string }>;
}

function formatNoticeDate(value?: string): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed);
}

function buildNoticeDescription(notice: NonNullable<Awaited<ReturnType<typeof getNoticeDetailData>>>): string {
  const title = notice.title || '공지사항';
  const contentSummary = sanitizeMetaDescription(
    notice.content,
    '운영 공지와 업데이트 소식을 빠르게 확인할 수 있습니다.',
    110,
  );
  const labels = [
    notice.is_important ? '중요 공지' : null,
    notice.is_popup ? '팝업 공지' : null,
    notice.view_count ? `조회수 ${notice.view_count}회` : null,
    formatNoticeDate(notice.upt_date || notice.crt_date),
  ].filter(Boolean);

  return labels.length > 0
    ? `${title}. ${contentSummary} ${labels.join(', ')} 기준으로 확인할 수 있습니다.`
    : `${title}. ${contentSummary}`;
}

export async function generateStaticParams() {
  const notices = await getNoticeStaticListData().catch(() => []);

  return notices
    .filter((notice) => !!notice.notice_id)
    .map((notice) => ({ noticeId: String(notice.notice_id) }));
}

export async function generateMetadata({
  params,
}: NoticeDetailPageProps): Promise<Metadata> {
  const { noticeId } = await params;
  const notice = await getNoticeDetailData(noticeId);

  if (!notice) {
    return buildPublicMetadata({
      title: '공지사항',
      description: '요청한 공지사항을 찾을 수 없습니다.',
      path: `/notice/${noticeId}`,
      keywords: ['공지사항 상세'],
      type: 'article',
      noIndex: true,
    });
  }

  const title = notice.title || '공지사항';
  const description = buildNoticeDescription(notice);

  return buildPublicMetadata({
    title,
    description,
    path: `/notice/${noticeId}`,
    keywords: [title, '공지사항 상세', '업데이트 공지', '운영 공지'],
    type: 'article',
    publishedTime: notice.crt_date,
    modifiedTime: notice.upt_date || notice.crt_date,
    authors: [notice.user_name || '운영팀'],
  });
}

export default async function NoticeDetailPage({
  params,
}: NoticeDetailPageProps) {
  const { noticeId } = await params;
  const notice = await getNoticeDetailData(noticeId);

  if (!notice) {
    notFound();
  }

  const title = notice.title || '공지사항';
  const description = buildNoticeDescription(notice);
  const pageUrl = getAbsoluteUrl(`/notice/${noticeId}`);
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url: pageUrl,
    mainEntityOfPage: pageUrl,
    inLanguage: 'ko-KR',
    datePublished: notice.crt_date || undefined,
    dateModified: notice.upt_date || notice.crt_date || undefined,
    author: {
      '@type': 'Person',
      name: notice.user_name || '운영팀',
    },
    publisher: {
      '@type': 'Organization',
      name: '전투 로그 분석 시스템',
    },
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: '공지사항', path: '/notice' },
    { name: title, path: `/notice/${noticeId}` },
  ]);

  return (
    <>
      <JsonLd data={[articleJsonLd, breadcrumbJsonLd]} />
      <NoticeDetailClient notice={notice} />
    </>
  );
}
