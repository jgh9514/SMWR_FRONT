import type { MetadataRoute } from 'next';
import { getNoticeStaticListData } from '@/shared/lib/api/server';
import { buildSitemapUrl, getLastModifiedDate } from '@/shared/lib/sitemap';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const notices = await getNoticeStaticListData().catch(() => []);

  return notices
    .filter((notice) => !!notice.notice_id)
    .map((notice) => ({
      url: buildSitemapUrl(`/notice/${notice.notice_id}`),
      lastModified: getLastModifiedDate(notice.upt_date ?? notice.crt_date, now),
      changeFrequency: notice.is_important ? 'daily' as const : 'weekly' as const,
      priority: notice.is_important ? 0.85 : 0.6,
    }));
}
