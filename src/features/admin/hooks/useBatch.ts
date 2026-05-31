/**
 * 배치 관리 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { useApiPostMutation } from '@/hooks/api/useApiMutation';

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
  /** 수동 실행 실시간 로그(SSE)용. 먼저 GET /batch/logs/stream/{stream_id} 연결 후 동일 ID로 실행 요청 */
  stream_id?: string;
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
  rslt_txt?: string; // 목록: 최대 512자 미리보기
  rslt_txt_truncated?: boolean;
  has_rslt_txt?: boolean;
  crt_user_id?: string;
  crt_date?: string;
}

export interface BatchHistoryDetailItem extends BatchHistoryItem {
  rslt_txt?: string;
}

/**
 * 배치 설정 목록 조회
 */
export const useBatchConfig = (params: Record<string, unknown> = {}) => {
  return useApiPostQuery<BatchConfigItem[]>('/batch/config', params, { enabled: true });
};

export interface BatchHistoryParams {
  bat_id?: string;
  limit?: number;
}

/**
 * 배치 실행 이력 조회
 */
export const useBatchHistory = (params: BatchHistoryParams = {}) => {
  return useApiPostQuery<BatchHistoryItem[]>('/batch/run-his', params, { enabled: true });
};

/**
 * 배치 실행 이력 상세(로그 전문)
 */
export const useBatchHistoryDetailMutation = (
  options?: Omit<
    Parameters<typeof useApiPostMutation<BatchHistoryDetailItem, { runSn: string | number }>>[1],
    'mutationFn'
  >,
) => {
  return useApiPostMutation<BatchHistoryDetailItem, { runSn: string | number }>(
    '/batch/run-his/detail',
    options,
  );
};

/**
 * 배치 재시작 Mutation
 */
export const useBatchRestart = (
  options?: Omit<Parameters<typeof useApiPostMutation<string, Record<string, unknown> | undefined>>[1], 'mutationFn'>
) => {
  return useApiPostMutation<string, Record<string, unknown> | undefined>('/batch/restart', options);
};

/**
 * 배치 수동 실행 Mutation
 */
export const useBatchRun = (
  options?: Omit<Parameters<typeof useApiPostMutation<BatchRunResponse, BatchRunRequest>>[1], 'mutationFn'>
) => {
  return useApiPostMutation<BatchRunResponse, BatchRunRequest>('/batch/run', options);
};

