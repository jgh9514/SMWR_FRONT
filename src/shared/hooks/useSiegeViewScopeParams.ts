import { useEffect, useMemo, useState } from 'react';
import {
  getSiegeViewScopeParamsForApi,
  readSiegeViewScopeFromUserInfo,
  SIEGE_VIEW_SCOPE_CHANGED_EVENT,
} from '@/shared/utils/siegeViewScope';

/**
 * 설정(userInfo.siege_view_scope)과 동기화된 점령전 조회 범위 파라미터.
 * WAS MyBatis는 요청 body의 siege_view_scope를 세션(JWT)보다 우선한다.
 */
export function useSiegeViewScopeParams() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onCustom = () => setTick((v) => v + 1);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'userInfo') setTick((v) => v + 1);
    };
    window.addEventListener(SIEGE_VIEW_SCOPE_CHANGED_EVENT, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(SIEGE_VIEW_SCOPE_CHANGED_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return useMemo(() => {
    void tick;
    return getSiegeViewScopeParamsForApi();
  }, [tick]);
}

/** 디버그·표시용 */
export function useSiegeViewScopeLabel() {
  const params = useSiegeViewScopeParams();
  return params.siege_view_scope === 'A' ? '전체 시즌' : '최근 시즌';
}

export { readSiegeViewScopeFromUserInfo };
