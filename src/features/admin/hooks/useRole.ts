/**
 * 권한 관리 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { useApiPostMutation } from '@/hooks/api/useApiMutation';
import { RoleItem, SaveRequest } from '@/types';

/**
 * 권한 목록 조회
 */
export const useRoleList = (params: Record<string, unknown> = {}) => {
  return useApiPostQuery<RoleItem[]>('/sm/role/list', params, { enabled: false });
};

/**
 * 권한 저장 Mutation
 */
export const useRoleSave = (
  options?: Omit<Parameters<typeof useApiPostMutation<unknown, SaveRequest<RoleItem>>>[1], 'mutationFn'>
) => {
  return useApiPostMutation<unknown, SaveRequest<RoleItem>>('/sm/role/save', options);
};

