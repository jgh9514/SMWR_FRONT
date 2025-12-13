/**
 * 권한별 사용자 관리 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { useApiPostMutation } from '@/hooks/api/useApiMutation';
import { UserRoleItem, SaveRequest } from '@/types';

/**
 * 권한별 사용자 목록 조회
 */
export const useUserRoleList = (params: Record<string, unknown> = {}) => {
  return useApiPostQuery<UserRoleItem[]>('/sm/userrole/list', params, { enabled: false });
};

/**
 * 권한별 사용자 저장 Mutation
 */
export const useUserRoleSave = (
  options?: Omit<Parameters<typeof useApiPostMutation<unknown, SaveRequest<UserRoleItem>>>[1], 'mutationFn'>
) => {
  return useApiPostMutation<unknown, SaveRequest<UserRoleItem>>('/sm/userrole/save', options);
};

