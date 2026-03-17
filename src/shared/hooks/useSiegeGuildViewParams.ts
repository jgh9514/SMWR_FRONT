import { useEffect, useMemo, useState } from 'react';
import { getSiegeGuildViewParamsForApi, readSiegeGuildViewSetting } from '@/shared/utils/siegeGuildView';
import type { UserInfo } from '@/features/auth/types/auth';

type AdminRole = NonNullable<UserInfo['roles']>[number] & {
  usg_yn?: string;
};

type AdminUserInfo = Omit<UserInfo, 'roles'> & {
  roles?: AdminRole[];
};

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
    const onCustomEvent: EventListener = onCustom;
    window.addEventListener('smwr:siege-guild-view-changed', onCustomEvent);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('smwr:siege-guild-view-changed', onCustomEvent);
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
      const userInfo = JSON.parse(rawUser) as AdminUserInfo;
      const roles = Array.isArray(userInfo?.roles) ? (userInfo.roles as AdminRole[]) : [];
      const isAdmin =
        roles.length > 0 &&
        roles.some((role) => {
          const roleId = String(role?.role_id ?? '');
          const enabled = role?.usg_yn == null ? true : String(role.usg_yn) === 'Y';
          return enabled && roleId === 'RL0001';
        });
      if (!isAdmin) return {};
    } catch {
      return {};
    }
    return getSiegeGuildViewParamsForApi();
  }, [tick]);
}

