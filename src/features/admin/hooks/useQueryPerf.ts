/**
 * DB 쿼리 성능(관리자) Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { useApiPostMutation } from '@/hooks/api/useApiMutation';

export interface SlowQueryItem {
  query_id: string;
  calls: number;
  total_ms: number;
  mean_ms: number;
  max_ms: number;
  rows: number;
  shared_blks_hit?: number;
  shared_blks_read?: number;
  temp_blks_read?: number;
  temp_blks_written?: number;
  blk_read_ms?: number;
  blk_write_ms?: number;
  query: string;
}

export interface RunningQueryItem {
  pid: number;
  usename: string;
  application_name?: string;
  client_addr?: string;
  state?: string;
  duration_ms: number;
  wait_event_type?: string;
  wait_event?: string;
  query: string;
}

export interface SlowQueriesResponse {
  list: SlowQueryItem[];
  source?: string;
}

export interface RunningQueriesResponse {
  list: RunningQueryItem[];
  source?: string;
}

export interface ResetQueryStatsResponse {
  result: string;
  message?: string;
}

export type SlowQueriesParams = {
  limit?: number;
  order_by?: 'total_ms' | 'mean_ms' | 'max_ms' | 'calls' | 'rows';
  order_dir?: 'asc' | 'desc';
  query_like?: string;
  min_mean_ms?: number;
  min_calls?: number;
};

export type RunningQueriesParams = {
  limit?: number;
  min_duration_ms?: number;
};

/**
 * 느린 쿼리 TOP 조회
 */
export const useAdminSlowQueries = (params: SlowQueriesParams, enabled = false) => {
  return useApiPostQuery<SlowQueriesResponse>('/admin/perf/slow-queries', params, { enabled });
};

/**
 * 현재 실행중 쿼리 조회
 */
export const useAdminRunningQueries = (params: RunningQueriesParams, enabled = false) => {
  return useApiPostQuery<RunningQueriesResponse>('/admin/perf/running-queries', params, { enabled });
};

/**
 * pg_stat_statements 누적 통계 리셋
 */
export const useAdminResetQueryStats = (
  options?: Omit<Parameters<typeof useApiPostMutation<ResetQueryStatsResponse, Record<string, unknown>>>[1], 'mutationFn'>
) => {
  return useApiPostMutation<ResetQueryStatsResponse, Record<string, unknown>>('/admin/perf/reset', options);
};

