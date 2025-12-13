/**
 * 코드 관리 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { useApiPostMutation } from '@/hooks/api/useApiMutation';
import {
  CodeGroup,
  CodeItem,
  CodeSaveRequest,
  CodeRelSaveRequest,
  CodeRelSaveResponse,
  ParentItem,
  ChildItem,
} from '@/types';

/**
 * 코드 그룹 목록 조회
 */
export const useCodeGroupList = (params?: Record<string, unknown>) => {
  return useApiPostQuery<CodeGroup[]>('/sm/cd/group', params || {}, { enabled: false });
};

/**
 * 코드 목록 조회
 */
export const useCodeList = (params?: Record<string, unknown>) => {
  return useApiPostQuery<CodeItem[]>('/sm/cd/list', params || {}, { enabled: false });
};

/**
 * 코드 저장 Mutation
 */
export const useCodeSave = () => {
  return useApiPostMutation<unknown, CodeSaveRequest>('/sm/cd/save');
};

/**
 * 부모 코드 목록 조회
 */
export const useParentCodeList = (params: Record<string, unknown> = {}) => {
  return useApiPostQuery<ParentItem[]>('/sm/cd/parent/list', params, { enabled: false });
};

/**
 * 코드 관계 목록 조회
 */
export const useCodeRelList = (params: Record<string, unknown> = {}) => {
  return useApiPostQuery<ChildItem[]>('/sm/cdrel/list', params, { enabled: false });
};

/**
 * 코드 관계 저장 Mutation
 */
export const useCodeRelSave = (options?: Parameters<typeof useApiPostMutation<CodeRelSaveResponse, CodeRelSaveRequest>>[1]) => {
  return useApiPostMutation<CodeRelSaveResponse, CodeRelSaveRequest>('/sm/cdrel/save', options);
};

/**
 * 코드 팝업 목록 조회
 */
export const useCodePopupList = (params: Record<string, unknown> = {}) => {
  return useApiPostQuery<CodeItem[]>('/sm/cd/popup', params, { enabled: false });
};

