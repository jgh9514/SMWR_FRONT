/**
 * 검색 관련 타입 정의
 */

import type { SearchData } from '@/shared/types/util';

export interface CodeGroupSearchData extends SearchData {
  bsns_cd?: string;
  dtl_bsns_cd?: string;
  cd_grp_no?: string;
  cd_grp_nm?: string;
}

export interface CodeSearchData extends SearchData {
  cd_grp_no?: string;
  cd?: string;
  cd_nm?: string;
}

