import type { MetadataRoute } from 'next';
import { getRtaMonsterStatsData } from '@/shared/lib/api/server';
import { buildSitemapUrl } from '@/shared/lib/sitemap';

const TOP_MONSTERS_LIMIT = 100;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const data = await getRtaMonsterStatsData(TOP_MONSTERS_LIMIT, 0).catch(() => ({ stats: [] }));

  return (data.stats ?? [])
    .filter((monster) => !!monster.monster_id)
    .map((monster) => ({
      url: buildSitemapUrl(`/rta/monster-stats/${monster.monster_id}`),
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.75,
    }));
}
