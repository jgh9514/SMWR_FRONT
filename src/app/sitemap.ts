import type { MetadataRoute } from 'next';
import { PUBLIC_SITEMAP_STATIC_ROUTES } from '@/shared/lib/site-indexing';
import { buildStaticSitemapEntries } from '@/shared/lib/sitemap';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  return buildStaticSitemapEntries(PUBLIC_SITEMAP_STATIC_ROUTES, now);
}
