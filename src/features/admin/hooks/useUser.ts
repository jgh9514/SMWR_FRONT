/**
 * 사용자 관리 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { useApiPostMutation } from '@/hooks/api/useApiMutation';
import { UserItem } from '@/features/admin/types/admin';

/**
 * 사용자 목록 조회
 */
export const useUserList = (params: Record<string, unknown> = {}) => {
  return useApiPostQuery<UserItem[]>('/sm/user/list', params, { enabled: true });
};

/**
 * 사용자 저장 Mutation (생성/수정)
 */
export const useUserSave = (
  options?: Parameters<typeof useApiPostMutation<string, Partial<UserItem>>>[1],
) => {
  return useApiPostMutation<string, Partial<UserItem>>('/sm/user/save', options);
};

