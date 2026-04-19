import type { MetadataRoute } from 'next';
import type { MonsterStats, RtaMonsterStatsResponse } from '@/features/rta/types/rta';
import { getRtaMonsterStatsData } from '@/shared/lib/api/server';
import { buildSitemapUrl } from '@/shared/lib/sitemap';

/** API 최대 limit(500)까지 한 번에 조회 — 사이트맵 URL 수 확보 */
const TOP_MONSTERS_LIMIT = 500;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const data = await getRtaMonsterStatsData({ limit: TOP_MONSTERS_LIMIT, statsOffset: 0 }).catch(
    (): RtaMonsterStatsResponse => ({ rows: [], has_more: false, type: 'solo' }),
  );

  return (data.rows ?? [])
    .filter((row): row is MonsterStats => 'monster_id' in row && !!row.monster_id)
    .map((monster) => ({
      url: buildSitemapUrl(`/monster-detail/${monster.monster_id}`),
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.75,
    }));
}
