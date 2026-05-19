import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import type {
  SiegeBattleLogListResponse,
  SiegeBattleReplayResponse,
} from '@/features/siege/map/types/siegeCollector';

export const useSiegeMatchBattleLogs = (
  matchId: string | undefined,
  options?: { baseNumber?: number | null; collectorOnly?: boolean; paging?: number; page?: number },
  enabled = true,
) => {
  return useApiPostQuery<SiegeBattleLogListResponse>(
    '/summonerswar/siege-collector-battle-log-list',
    {
      match_id: matchId,
      paging: options?.paging ?? 30,
      page: options?.page ?? 1,
      ...(options?.collectorOnly ? { collector_only: true } : {}),
      ...(options?.baseNumber != null && options.baseNumber > 0
        ? { base_number: options.baseNumber }
        : {}),
    },
    {
      enabled: enabled && Boolean(matchId),
    },
  );
};

export const useSiegeBattleReplay = (rid: number | null | undefined, enabled = true) => {
  return useApiPostQuery<SiegeBattleReplayResponse>(
    '/summonerswar/siege-collector-battle-replay',
    { rid },
    {
      enabled: enabled && rid != null && rid > 0,
    },
  );
};
