/**
 * 다국어 관리 Hooks
 */

import { useApiPostQuery } from '@/hooks/api';
import type { MlangItem } from '@/types';

/**
 * 다국어 목록 조회
 */
export const useMlangList = (params: Record<string, unknown>, enabled = false) => {
  return useApiPostQuery<MlangItem[]>('/sm/mlang/list', params, { enabled });
};

