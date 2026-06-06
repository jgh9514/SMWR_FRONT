import { useMemo } from 'react';
import { useSiegeGuildViewParams } from '@/shared/hooks/useSiegeGuildViewParams';
import { useSiegeViewScopeParams } from '@/shared/hooks/useSiegeViewScopeParams';

/** 점령전 목록·상세 API 공통 — 길드 조회 + 시즌 조회 범위 */
export function useSiegeApiContextParams() {
  const guildParams = useSiegeGuildViewParams();
  const scopeParams = useSiegeViewScopeParams();
  return useMemo(
    () => ({ ...guildParams, ...scopeParams }),
    [guildParams, scopeParams],
  );
}
