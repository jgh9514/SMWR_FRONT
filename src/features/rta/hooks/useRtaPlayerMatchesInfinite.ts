import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api/client';
import { processRawMatchToMatchItem } from '@/features/rta/utils/processRtaMatchItem';
import type { MatchItem, RawMatchItem } from '@/types';

const PAGE_SIZE = 20;

export function useRtaPlayerMatchesInfinite(
  wizardId: string,
  enabled = true,
  seasonCode?: string | null,
) {
  const id = wizardId?.trim() ?? '';
  const sc = seasonCode?.trim() ?? '';
  return useInfiniteQuery({
    queryKey: ['rta', 'player', 'matches', id, sc],
    queryFn: async ({ pageParam }) => {
      const path = `/rta/matches/player/${encodeURIComponent(id)}`;
      const body: Record<string, unknown> = {
        limit: PAGE_SIZE,
        offset: pageParam as number,
      };
      if (sc) body.seasonCode = sc;
      const raw = await apiClient.post<RawMatchItem[]>(path, body);
      const list = Array.isArray(raw) ? raw : [];
      return list.map(processRawMatchToMatchItem);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.reduce((acc, p) => acc + p.length, 0);
    },
    enabled: enabled && id.length > 0,
    staleTime: 0,
    gcTime: 0,
  });
}
