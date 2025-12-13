/**
 * 페이지 관리 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { PageItem, ConditionItem } from '@/types';

/**
 * 페이지 목록 조회
 */
export const usePageList = (params: Record<string, unknown> = {}) => {
  return useApiPostQuery<PageItem[]>('/sm/page/list', params, { enabled: false });
};

/**
 * 페이지 조건 목록 조회
 */
export const usePageConditionList = (pageId: string | null) => {
  return useApiPostQuery<ConditionItem[]>('/sm/pagecondition/list', { page_id: pageId }, {
    enabled: !!pageId,
  });
};

