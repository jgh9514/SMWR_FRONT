/**
 * 배치 관리 Hook
 * Admin API(smwr-admin 8081) 사용
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useMutation, UseMutationResult, UseMutationOptions } from '@tanstack/react-query';
import { adminApiClient } from '@/shared/lib/api/client';
import { adminAxiosInstance } from '@/shared/lib/axios';
import { BATCH_RUN_TIMEOUT_MS } from '@/shared/constants';

export interface BatchConfigItem {
  bat_id: string;
  bat_nm: string;
  job_class: string;
  cron_expr: string;
  use_yn: string;
  sort_sn: number;
  desc_txt?: string;
}

export interface BatchRunRequest {
  job_key?: string;
  cd?: string;
  job_data?: Record<string, unknown>;
}

export interface BatchRunResponse {
  result: string;
  message?: string;
}

export interface BatchHistoryItem {
  bat_exe_log_sn: string | number; // run_sn
  bat_id: string;
  exe_dtm: string; // start_dtm
  end_dtm?: string;
  rslt_cd: string; // SUCCESS, FAIL, RUNNING 등
  rslt_txt?: string; // 결과 메시지
  crt_user_id?: string;
  crt_date?: string;
}

/**
 * 배치 설정 목록 조회
 */
export const useBatchConfig = (params: Record<string, unknown> = {}): UseQueryResult<BatchConfigItem[], Error> => {
  return useQuery({
    queryKey: ['/batch/config', params],
    queryFn: () => adminApiClient.post<BatchConfigItem[]>('/batch/config', params),
    enabled: true,
  });
};

/**
 * 배치 실행 이력 조회
 */
export const useBatchHistory = (params: Record<string, unknown> = {}): UseQueryResult<BatchHistoryItem[], Error> => {
  return useQuery({
    queryKey: ['/batch/run-his', params],
    queryFn: () => adminApiClient.post<BatchHistoryItem[]>('/batch/run-his', params),
    enabled: true,
  });
};

/**
 * 배치 재시작 Mutation
 */
export const useBatchRestart = (
  options?: Omit<UseMutationOptions<string, Error, Record<string, unknown> | undefined>, 'mutationFn'>
): UseMutationResult<string, Error, Record<string, unknown> | undefined> => {
  return useMutation({
    mutationFn: (variables) => adminApiClient.post<string>('/batch/restart', variables),
    ...options,
  });
};

/**
 * 배치 수동 실행 Mutation (동기 - 배치 완료까지 대기)
 */
export const useBatchRun = (
  options?: Omit<UseMutationOptions<BatchRunResponse, Error, BatchRunRequest>, 'mutationFn'>
): UseMutationResult<BatchRunResponse, Error, BatchRunRequest> => {
  return useMutation({
    mutationFn: async (variables) => {
      const { data } = await adminAxiosInstance.post<BatchRunResponse>('/batch/run', variables, {
        timeout: BATCH_RUN_TIMEOUT_MS,
      });
      return data;
    },
    ...options,
  });
};

