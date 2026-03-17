import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/shared/lib/env';

export function getLastModifiedDate(value: string | undefined, fallback: Date): Date {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function buildSitemapUrl(path: string): string {
  return `${getSiteUrl()}${path}`;
}

export function buildStaticSitemapEntries(
  routes: ReadonlyArray<{
    path: string;
    name?: string;
    changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
    priority: number;
  }>,
  lastModified: Date,
): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: buildSitemapUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
