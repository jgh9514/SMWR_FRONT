import type { Metadata } from 'next';
import NoticeBoardClient from '@/features/community/components/NoticeBoardClient';
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/validation';
import { getNoticeListData } from '@/shared/lib/api/server';
import { buildBreadcrumbJsonLd, buildPublicMetadata, getAbsoluteUrl } from '@/shared/lib/seo';
import JsonLd from '@/shared/ui/seo/JsonLd';

export const revalidate = 300;

export const metadata: Metadata = buildPublicMetadata({
  title: '공지사항',
  description:
    '운영 공지, 업데이트 안내, 서비스 변경 사항을 빠르게 확인하고 최신 소식을 상세 페이지까지 이어서 살펴볼 수 있습니다.',
  path: '/notice',
  keywords: ['공지사항', '업데이트 소식', '운영 공지', '서비스 안내'],
});

export default async function NoticePage() {
  const initialData = await getNoticeListData({ page: 1, limit: DEFAULT_PAGE_SIZE }).catch(() => ({
    list: [],
    total: 0,
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
  }));
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '공지사항',
    url: getAbsoluteUrl('/notice'),
    inLanguage: 'ko-KR',
    description:
      '운영 공지, 업데이트 안내, 서비스 변경 사항을 빠르게 확인하고 최신 소식을 상세 페이지까지 이어서 살펴볼 수 있습니다.',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: initialData.list.length,
    },
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: '홈', path: '/' },
    { name: '공지사항', path: '/notice' },
  ]);

  return (
    <>
      <JsonLd data={[jsonLd, breadcrumbJsonLd]} />
      <NoticeBoardClient initialData={initialData} />
    </>
  );
}

