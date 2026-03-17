/**
 * 코드 관계 관리 Hooks
 */

import { useApiPostQuery } from '@/hooks/api';
import type { ChildItem, ParentItem, PopupItem } from '@/types';

/**
 * 부모 코드 목록 조회
 */
export const useParentCodeList = (params: Record<string, unknown>, enabled = false) => {
  return useApiPostQuery<ParentItem[]>('/sm/cd/parent/list', params, { enabled });
};

/**
 * 코드 관계(자식 코드) 목록 조회
 */
export const useCodeRelationList = (params: Record<string, unknown>, enabled = false) => {
  return useApiPostQuery<ChildItem[]>('/sm/cdrel/list', params, { enabled });
};

/**
 * 코드 팝업 목록 조회
 */
export const useCodePopupList = (params: Record<string, unknown>, enabled = false) => {
  return useApiPostQuery<PopupItem[]>('/sm/cd/popup', params, { enabled });
};

