/**
 * 관리자 페이지 관련 타입 정의
 */

export interface SearchData {
  role_id?: string;
  role_nm?: string;
  user_id?: string;
  user_nm?: string;
  menu_id?: string;
  menu_nm?: string;
  api_id?: string;
  page_id?: string;
  page_nm?: string;
  [key: string]: any;
}

import type { CodeGroups } from '@/shared/types/util';

export type CodeListData = CodeGroups;

export interface EditingItem<T = Record<string, unknown>> {
  row_status?: 'C' | 'U' | 'D' | '';
  [key: string]: unknown;
}

