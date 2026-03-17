/**
 * 관리자 페이지 관련 타입 정의
 */

import type { CodeGroups, SearchData as UtilSearchData } from '@/shared/types/util';

export interface SearchData extends UtilSearchData {
  role_id?: string;
  role_nm?: string;
  user_id?: string;
  user_nm?: string;
  menu_id?: string;
  menu_nm?: string;
  api_id?: string;
  page_id?: string;
  page_nm?: string;
}

export type CodeListData = CodeGroups;

export interface EditingItem {
  row_status?: 'C' | 'U' | 'D' | '';
  [key: string]: unknown;
}

