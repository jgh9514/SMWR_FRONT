import { useEffect, useMemo, useState } from 'react';
import { getSiegeGuildViewParamsForApi, readSiegeGuildViewSetting } from '@/shared/utils/siegeGuildView';

/**
 * 관리자 전용 "전체/특정 길드" 조회 파라미터를 React state로 동기화합니다.
 * - Settings에서 저장 시 custom event로 갱신
 * - 다른 탭 변경 시 storage 이벤트로 갱신
 */
export function useSiegeGuildViewParams() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onCustom = () => setTick((v) => v + 1);
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.includes('smwr:siege-guild-view')) setTick((v) => v + 1);
    };
    window.addEventListener('smwr:siege-guild-view-changed', onCustom as any);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('smwr:siege-guild-view-changed', onCustom as any);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return useMemo(() => {
    // tick is used only to re-compute
    void tick;
    // ensure JSON is parseable even if corrupted
    readSiegeGuildViewSetting();
    if (typeof window === 'undefined') return {};
    try {
      const rawUser = window.localStorage.getItem('userInfo');
      if (!rawUser) return {};
      const userInfo = JSON.parse(rawUser) as any;
      const isAdmin =
        Array.isArray(userInfo?.roles) &&
        userInfo.roles.some((r: any) => {
          const roleId = String(r?.role_id ?? '');
          const enabled = r?.usg_yn == null ? true : String(r?.usg_yn) === 'Y';
          return enabled && roleId === 'RL0001';
        });
      if (!isAdmin) return {};
    } catch {
      return {};
    }
    return getSiegeGuildViewParamsForApi();
  }, [tick]);
}

