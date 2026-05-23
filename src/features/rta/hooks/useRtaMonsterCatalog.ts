'use client';

import { useMemo } from 'react';
import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { normalizeMonsterList } from '@/features/siege/lib/normalizeMonsterOption';
import { getMonsterImageUrl } from '@/shared/utils/image';
import type { MonsterOption } from '@/features/siege/hooks/useSiegeList';

export interface MonsterCatalogEntry {
  name: string;
  imageUrl: string;
}

/** monster_id(string) → {name, imageUrl} 맵. staleTime 24h — 몬스터 메타는 거의 불변. */
export function useRtaMonsterCatalog(): Map<string, MonsterCatalogEntry> {
  const { data: raw } = useApiPostQuery<MonsterOption[]>(
    '/summonerswar/monster-list',
    {},
    {
      enabled: true,
      select: (r) => normalizeMonsterList(r),
      staleTime: 24 * 60 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  );

  return useMemo(() => {
    const map = new Map<string, MonsterCatalogEntry>();
    if (!raw) return map;
    for (const m of raw) {
      const id = String(m.monster_id ?? '').trim();
      if (!id) continue;
      map.set(id, {
        name: m.modified_kr_name?.trim() || m.kr_name?.trim() || `#${id}`,
        imageUrl: getMonsterImageUrl(m.image_url),
      });
    }
    return map;
  }, [raw]);
}
