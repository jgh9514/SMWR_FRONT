import { useMemo } from 'react';
import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import type { RuneMaster } from '@/features/siege/types/rune';

const RUNE_MASTER_QUERY_KEY = ['/summonerswar/rune-master/list'] as const;

export function useRuneMasterList() {
  const query = useApiPostQuery<RuneMaster[]>('/summonerswar/rune-master/list', {}, {
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const runeById = useMemo(() => {
    const map = new Map<number, RuneMaster>();
    for (const rune of query.data ?? []) {
      if (rune?.rune_id != null) {
        map.set(Number(rune.rune_id), rune);
      }
    }
    return map;
  }, [query.data]);

  return { ...query, runeById };
}

export { RUNE_MASTER_QUERY_KEY };
