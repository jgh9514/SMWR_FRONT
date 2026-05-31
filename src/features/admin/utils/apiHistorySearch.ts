/** API 이력 검색 폼 → POST body (exe_dtm은 WAS에서 yyyyMMddHHmmss로 정규화) */

export interface ApiHistoryFilterForm {
  user_id: string;
  api_id: string;
  api_exe_url_keyword: string;
  trace_id: string;
  http_status: string;
  mthd_tp_cd: string;
  ip_addr: string;
  start_exe_dtm: string;
  end_exe_dtm: string;
  min_elapsed_ms: string;
  max_elapsed_ms: string;
  error_only: boolean;
  slow_only: boolean;
  slow_threshold_ms: string;
  observability_only: boolean;
}

export const DEFAULT_API_HISTORY_FILTERS: ApiHistoryFilterForm = {
  user_id: '',
  api_id: '',
  api_exe_url_keyword: '',
  trace_id: '',
  http_status: '',
  mthd_tp_cd: '',
  ip_addr: '',
  start_exe_dtm: '',
  end_exe_dtm: '',
  min_elapsed_ms: '',
  max_elapsed_ms: '',
  error_only: false,
  slow_only: false,
  slow_threshold_ms: '1000',
  observability_only: true,
};

function parseOptionalInt(value: string): number | undefined {
  const t = value.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function parseOptionalLong(value: string): number | undefined {
  return parseOptionalInt(value);
}

export function buildApiHistoryRequestBody(
  filters: ApiHistoryFilterForm,
  page: number,
  pageSize: number
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    limit: pageSize,
    offset: Math.max(0, page - 1) * pageSize,
    observability_only: filters.observability_only,
  };

  if (filters.user_id.trim()) body.user_id = filters.user_id.trim();
  if (filters.api_id.trim()) body.api_id = filters.api_id.trim();
  if (filters.api_exe_url_keyword.trim()) body.api_exe_url_keyword = filters.api_exe_url_keyword.trim();
  if (filters.trace_id.trim()) body.trace_id = filters.trace_id.trim();
  if (filters.mthd_tp_cd.trim()) body.mthd_tp_cd = filters.mthd_tp_cd.trim();
  if (filters.ip_addr.trim()) body.ip_addr = filters.ip_addr.trim();
  if (filters.start_exe_dtm.trim()) body.start_exe_dtm = filters.start_exe_dtm.trim();
  if (filters.end_exe_dtm.trim()) body.end_exe_dtm = filters.end_exe_dtm.trim();

  const httpStatus = parseOptionalInt(filters.http_status);
  if (httpStatus != null) body.http_status = httpStatus;

  const minElapsed = parseOptionalLong(filters.min_elapsed_ms);
  if (minElapsed != null) body.min_elapsed_ms = minElapsed;

  const maxElapsed = parseOptionalLong(filters.max_elapsed_ms);
  if (maxElapsed != null) body.max_elapsed_ms = maxElapsed;

  if (filters.error_only) body.error_only = true;
  if (filters.slow_only) {
    body.slow_only = true;
    const slowThreshold = parseOptionalLong(filters.slow_threshold_ms);
    if (slowThreshold != null) body.slow_threshold_ms = slowThreshold;
  }

  return body;
}

/** URL 쿼리(incident·error_only 등) → 폼 초기값 병합 */
export function mergeApiHistoryFiltersFromUrl(
  base: ApiHistoryFilterForm,
  params: URLSearchParams
): ApiHistoryFilterForm {
  const next = { ...base };
  if (params.get('error_only') === 'true') next.error_only = true;
  if (params.get('slow_only') === 'true') next.slow_only = true;
  const slowMs = params.get('slow_threshold_ms');
  if (slowMs) next.slow_threshold_ms = slowMs;
  return next;
}
