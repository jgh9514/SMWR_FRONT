import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/shared/lib/env';
import { PRIVATE_DISALLOW_PATHS } from '@/shared/lib/site-indexing';
import { buildSitemapUrl } from '@/shared/lib/sitemap';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [...PRIVATE_DISALLOW_PATHS],
      },
    ],
    sitemap: [
      buildSitemapUrl('/sitemap.xml'),
      buildSitemapUrl('/monster-detail/sitemap.xml'),
      buildSitemapUrl('/rta/monster-stats/sitemap.xml'),
      buildSitemapUrl('/notice/sitemap.xml'),
    ],
    host: getSiteUrl(),
  };
}
