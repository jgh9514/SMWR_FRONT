/**
 * 공통 타입 정의
 */

export interface SearchParams {
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success?: boolean;
}

export interface SaveRequest<T = unknown> {
  insertRow: T[];
  updateRow: T[];
  deleteRow: T[];
}

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface CodeList {
  cd: string[];
  cd_nm: string[];
}

export interface CommonCodeList {
  [key: string]: CodeList;
}

