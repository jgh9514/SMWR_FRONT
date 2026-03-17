/**
 * 메뉴 관리 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { useApiPostMutation } from '@/hooks/api/useApiMutation';
import { MenuItem, RoleItem, SaveRequest } from '@/types';

export interface MenuRoleItem extends RoleItem {
  rolechk?: 'Y' | 'N';
}

/**
 * 메뉴 목록 조회
 */
export const useMenuList = () => {
  return useApiPostQuery<MenuItem[]>('/sm/menu/list', {}, { enabled: true });
};

/**
 * 메뉴 저장 Mutation
 */
export const useMenuSave = (
  options?: Omit<Parameters<typeof useApiPostMutation<unknown, SaveRequest<MenuItem>>>[1], 'mutationFn'>
) => {
  return useApiPostMutation<unknown, SaveRequest<MenuItem>>('/sm/menu/save', options);
};

/**
 * 메뉴 권한 조회
 */
export const useMenuRoleList = (menuId: string | null) => {
  return useApiPostQuery<MenuRoleItem[]>('/sm/menurole/list', { menu_id: menuId }, {
    enabled: !!menuId,
  });
};

/**
 * 메뉴 권한 저장 Mutation
 */
export const useMenuRoleSave = (
  options?: Omit<Parameters<typeof useApiPostMutation<unknown, { menu_id: string; roleList: MenuRoleItem[] }>>[1], 'mutationFn'>
) => {
  return useApiPostMutation<unknown, { menu_id: string; roleList: MenuRoleItem[] }>('/sm/menurole/save', options);
};

