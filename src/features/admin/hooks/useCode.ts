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
  ChildItem,
} from '@/types';

/**
 * 코드 그룹 목록 조회
 */
export const useCodeGroupList = (params?: Record<string, unknown>) => {
  return useApiPostQuery<CodeGroup[]>('/sm/cd/group', params || {}, { enabled: true });
};

/**
 * 코드 목록 조회
 */
export const useCodeList = (params?: Record<string, unknown>) => {
  const hasCdGrpNo = params && params.cd_grp_no && String(params.cd_grp_no).trim() !== '';
  return useApiPostQuery<CodeItem[]>('/sm/cd/list', params || {}, { enabled: !!hasCdGrpNo });
};

/**
 * 코드 저장 Mutation
 */
export const useCodeSave = () => {
  return useApiPostMutation<unknown, CodeSaveRequest>('/sm/cd/save');
};

/**
 * 코드 관계 목록 조회
 */
export const useCodeRelList = (params: Record<string, unknown> = {}) => {
  const hasParentCode =
    params.up_cd_grp_no &&
    String(params.up_cd_grp_no).trim() !== '' &&
    params.up_cd &&
    String(params.up_cd).trim() !== '';

  return useApiPostQuery<ChildItem[]>('/sm/cdrel/list', params, { enabled: !!hasParentCode });
};

/**
 * 코드 관계 저장 Mutation
 */
export const useCodeRelSave = (options?: Parameters<typeof useApiPostMutation<CodeRelSaveResponse, CodeRelSaveRequest>>[1]) => {
  return useApiPostMutation<CodeRelSaveResponse, CodeRelSaveRequest>('/sm/cdrel/save', options);
};

