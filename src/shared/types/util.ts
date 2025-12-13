/**
 * 유틸리티 함수 타입 정의
 */

export interface CodeGroup {
  cd: string[];
  cd_nm: string[];
  up_cd?: string[];
}

export interface CodeGroups {
  [key: string]: CodeGroup;
}

export interface SearchDataValue {
  value?: string | number | boolean;
  [key: string]: unknown;
}

export type SearchData = Record<string, string | number | boolean | string[] | SearchDataValue | undefined>;

