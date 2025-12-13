/**
 * API 관리 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { useApiPostMutation } from '@/hooks/api/useApiMutation';
import { ApiItem, RoleItem } from '@/types';

/**
 * API 목록 조회
 */
export const useApiList = (params: Record<string, unknown> = {}) => {
  return useApiPostQuery<ApiItem[]>('/sm/api/list', params, { enabled: false });
};

/**
 * API 권한 조회
 */
export const useApiRoleList = (apiId: string | null) => {
  return useApiPostQuery<unknown[]>('/sm/apirole/list', { api_id: apiId }, {
    enabled: !!apiId,
  });
};

/**
 * API 권한 저장 Mutation
 */
export const useApiRoleSave = (
  options?: Omit<Parameters<typeof useApiPostMutation<unknown, { api_id: string; roleList: unknown[] }>>[1], 'mutationFn'>
) => {
  return useApiPostMutation<unknown, { api_id: string; roleList: unknown[] }>('/sm/apirole/save', options);
};

/**
 * 권한별 API 조회
 */
export const useRoleApiList = (params: Record<string, unknown> = {}) => {
  return useApiPostQuery<ApiItem[]>('/sm/roleapi/list', params, { enabled: false });
};

/**
 * 권한별 API 저장 Mutation
 */
export const useRoleApiSave = (
  options?: Omit<Parameters<typeof useApiPostMutation<unknown, { role_id: string; apiList: unknown[] }>>[1], 'mutationFn'>
) => {
  return useApiPostMutation<unknown, { role_id: string; apiList: unknown[] }>('/sm/roleapi/save', options);
};

