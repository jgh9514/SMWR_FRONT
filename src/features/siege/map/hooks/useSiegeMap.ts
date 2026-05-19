import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import type {
  SiegeMapBaseDefenseResponse,
  SiegeMapHistoryListResponse,
  SiegeMapLayoutMasterResponse,
  SiegeMapTimelinePoint,
  SiegeMapViewResponse,
} from '@/features/siege/map/types/siegeMap';

export const useSiegeMapLayoutMaster = (enabled = true) => {
  return useApiPostQuery<SiegeMapLayoutMasterResponse>(
    '/summonerswar/siege-map/layout-master',
    {},
    {
      enabled,
      staleTime: 24 * 60 * 60 * 1000,
    },
  );
};

export const useSiegeMapView = (
  matchId: string | undefined,
  snapshotId?: number | null,
  enabled = true,
) => {
  return useApiPostQuery<SiegeMapViewResponse>(
    '/summonerswar/siege-map/view',
    {
      match_id: matchId,
      ...(snapshotId != null && snapshotId > 0 ? { snapshot_id: snapshotId } : {}),
    },
    {
      enabled: enabled && Boolean(matchId),
      refetchInterval: snapshotId ? false : 30_000,
    },
  );
};

export const useSiegeMapHistory = (params: Record<string, unknown>, enabled = true) => {
  return useApiPostQuery<SiegeMapHistoryListResponse>(
    '/summonerswar/siege-map/history-list',
    params,
    { enabled },
  );
};

export const useSiegeMapTimeline = (matchId: string | undefined, enabled = true) => {
  return useApiPostQuery<SiegeMapTimelinePoint[]>(
    '/summonerswar/siege-map/timeline',
    { match_id: matchId },
    { enabled: enabled && Boolean(matchId) },
  );
};

export const useSiegeMapBaseDefense = (
  matchId: string | undefined,
  baseNumber: number | null,
  snapshotId: number | null | undefined,
  enabled = true,
) => {
  return useApiPostQuery<SiegeMapBaseDefenseResponse>(
    '/summonerswar/siege-map-base-defense',
    {
      match_id: matchId,
      base_number: baseNumber,
      ...(snapshotId != null && snapshotId > 0 ? { snapshot_id: snapshotId } : {}),
    },
    {
      enabled: enabled && Boolean(matchId) && baseNumber != null && baseNumber > 0,
    },
  );
};
