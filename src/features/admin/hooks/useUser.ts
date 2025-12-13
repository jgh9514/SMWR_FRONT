/**
 * 사용자 관리 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { UserItem } from '@/features/admin/types/admin';

/**
 * 사용자 목록 조회
 */
export const useUserList = (params: Record<string, unknown> = {}) => {
  return useApiPostQuery<UserItem[]>('/sm/user/list', params, { enabled: false });
};

