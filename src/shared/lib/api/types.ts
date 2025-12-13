/**
 * API 타입 정의
 */

export interface ApiResponse<T = unknown> {
  result?: string;
  data?: T;
  message?: string;
  [key: string]: unknown;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationResponse<T = unknown> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SearchParams {
  [key: string]: unknown;
}

