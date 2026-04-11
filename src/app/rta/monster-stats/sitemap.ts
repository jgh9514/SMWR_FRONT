import type { MetadataRoute } from 'next';
import { getRtaMonsterStatsData } from '@/shared/lib/api/server';
import { buildSitemapUrl } from '@/shared/lib/sitemap';

/** API 최대 limit(500)까지 한 번에 조회 — 사이트맵 URL 수 확보 */
const TOP_MONSTERS_LIMIT = 500;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const data = await getRtaMonsterStatsData({ limit: TOP_MONSTERS_LIMIT, statsOffset: 0 }).catch(() => ({
    stats: [],
  }));

  return (data.stats ?? [])
    .filter((monster) => !!monster.monster_id)
    .map((monster) => ({
      url: buildSitemapUrl(`/rta/monster-stats/${monster.monster_id}`),
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.75,
    }));
}
