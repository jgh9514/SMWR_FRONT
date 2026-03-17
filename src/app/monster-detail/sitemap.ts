import type { MetadataRoute } from 'next';
import { getMonsterListData } from '@/shared/lib/api/server';
import { buildSitemapUrl } from '@/shared/lib/sitemap';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const monsterList = await getMonsterListData().catch(() => []);

  return monsterList
    .filter((monster) => !!monster.monster_id)
    .map((monster) => ({
      url: buildSitemapUrl(`/monster-detail/${monster.monster_id}`),
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.65,
    }));
}
