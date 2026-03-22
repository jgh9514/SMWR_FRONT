/**
 * 시즌 목록 조회 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import type { SeasonItem } from '@/features/battle-history/types/battle-history';

export const useSeasonList = () => {
  return useApiPostQuery<SeasonItem[]>('/summonerswar/season-list', {}, { enabled: true });
};
