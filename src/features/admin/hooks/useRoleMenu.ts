/**
 * 권한별 메뉴 관리 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { useApiPostMutation } from '@/hooks/api/useApiMutation';
import { MenuItem } from '@/types';

/**
 * 권한별 메뉴 목록 조회
 */
export const useRoleMenuList = (params: Record<string, unknown> = {}) => {
  return useApiPostQuery<MenuItem[]>('/sm/rolemenu/list', params, { enabled: false });
};

/**
 * 권한별 메뉴 저장 Mutation
 */
export const useRoleMenuSave = (options?: Parameters<typeof useApiPostMutation<unknown, { role_id: string; menuList: unknown[] }>>[1]) => {
  return useApiPostMutation<unknown, { role_id: string; menuList: unknown[] }>('/sm/rolemenu/save', options);
};

