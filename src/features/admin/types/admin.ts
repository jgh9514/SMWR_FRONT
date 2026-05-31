/**
 * Admin 관련 타입 정의
 */

export interface UserItem {
  user_id: string;
  user_name?: string;
  user_nm?: string;
  user_pw?: string;
  email?: string;
  usg_yn?: string;
  del_yn?: string;
  lang_cd?: string;
  crt_date?: string;
  upd_date?: string;
  roles?: RoleItem[];
  row_status?: string;
}

export interface LoginHisItem {
  user_id: string;
  user_name?: string;
  usr_id?: string;
  usr_nm?: string;
  login_date?: string;
  login_dtm?: string;
  logout_date?: string;
  ip_addr?: string;
  role_list?: string;
}

// API 이력
export interface ApiHisItem {
  usr_id: string;
  usr_nm: string;
  api_id?: string;
  api_exe_url?: string;
  exe_dtm: string;
  ip_addr?: string;
  role_nm?: string;
  user_id?: string;
  trace_id?: string;
  http_status?: number;
  elapsed_ms?: number;
  mthd_tp_cd?: string;
}

export interface ApiHistoryResponse {
  items: ApiHisItem[];
  list: ApiHisItem[];
  totalCount: number;
  limit: number;
  offset: number;
  httpStatusEnabled?: boolean;
  elapsedMsEnabled?: boolean;
  traceIdEnabled?: boolean;
  observabilityOnly?: boolean;
}

/** POST /common/sm/api-his 요청 파라미터 */
export type ApiHistoryQueryParams = Record<string, unknown>;

// 권한 관련
export interface RoleItem {
  role_id: string;
  role_nm: string;
  role_desc?: string;
  bsns_cd?: string;
  usr_cnt?: number;
  usg_yn?: string;
  srt_sn?: string;
  crt_date?: string;
  upd_date?: string;
  row_status?: string;
}

export interface UserRoleItem {
  user_id: string;
  role_id: string;
  user_name?: string;
  role_nm?: string;
  usr_id?: string;
  emp_no?: string;
  usr_nm?: string;
  dept_nm?: string;
  usg_yn?: string;
  crt_date?: string;
  upd_date?: string;
  row_status?: string;
}

export interface SaveRequest<T> {
  insertRow: T[];
  updateRow: T[];
  deleteRow: T[];
}

export interface MlangItem {
  lang_cd: string;
  lang_nm: string;
  mlang_id?: string;
  key: string;
  value: string;
  mlang_tp_cd?: string;
  bsns_cd?: string;
  mlang_txt?: string;
  usr_nm?: string;
  upt_dt?: string;
  crt_date?: string;
  upd_date?: string;
  row_status?: string;
}

/**
 * 대시보드 통계 타입 (백엔드 응답 구조에 맞춤)
 */
export interface DashboardStats {
  todaySignups: number; // 오늘 가입한 사람 수
  totalUsers: number; // 전체 사용자 수
  todayLogins: number; // 오늘 로그인 사용자 수 (중복 제거)
  todayPosts: number; // 오늘 게시글 수 (공지사항 + 문의)
  todayGuildApplications: number; // 오늘 길드 신청건
}

/**
 * 일별 통계 데이터 (차트용) - 백엔드 응답 구조에 맞춤
 */
export interface DailyStats {
  date: string; // YYYY-MM-DD
  signups: number;
  logins: number; // 로그인 수
  posts: number;
  guildApplications: number;
}

/**
 * 대시보드 통계 응답
 */
export interface DashboardStatsResponse {
  stats: DashboardStats;
  dailyStats: DailyStats[]; // 최근 7일 또는 30일 데이터
  opsMetrics?: OpsMetricsSnapshot;
}

export interface IncidentDetail {
  incidentType: string;
  title: string;
  shortLabel: string;
  owner: string;
  priority: string;
  playbook: string;
  message: string;
  badgeColor: string;
  slaMinutes: number;
  autoRefreshSeconds: number;
  target: string;
  method: string;
  requestBody: Record<string, unknown>;
  deepLink: string;
}

export interface HealthRateStatus {
  metric: string;
  value: number;
  totalCount: number;
  matchedCount: number;
  warningThreshold: number;
  criticalThreshold: number;
  status: string;
  message: string;
}

export interface OpsHealthSummary {
  runtime: string;
  apiErrorRate: HealthRateStatus;
  apiSlowRate: HealthRateStatus;
  status: string;
  incidentTypes: string[];
  primaryIncidentType: string;
  incidentDetails: IncidentDetail[];
  reasons: string[];
  summaryMessage: string;
  recommendedActions: string[];
}

export interface RuntimeHealthStatusItem {
  metric: string;
  value: number;
  warningThreshold: number;
  criticalThreshold: number;
  unit: string;
  status: string;
  message: string;
}

export interface RuntimeHealthSnapshot {
  heap: RuntimeHealthStatusItem;
  processCpu: RuntimeHealthStatusItem;
  systemCpu: RuntimeHealthStatusItem;
  threads: RuntimeHealthStatusItem;
  gcPause: RuntimeHealthStatusItem;
  status: string;
  incidentTypes: string[];
  primaryIncidentType: string;
  reasons: string[];
  summaryMessage: string;
}

export interface ApiLogSummary {
  recent_count?: number;
  error_count?: number;
  slow_count?: number;
  max_elapsed_ms?: number;
}

export interface ApiLogSample {
  exe_dtm: string;
  user_id?: string;
  api_exe_url?: string;
  mthd_tp_cd?: string;
  trace_id?: string;
  http_status?: number;
  elapsed_ms?: number;
}

export interface ApiLogDiagnostics {
  windowHours: number;
  startExeDtm: string;
  slowThresholdMs: number;
  limit: number;
  traceIdEnabled: boolean;
  httpStatusEnabled: boolean;
  elapsedMsEnabled: boolean;
  summary?: ApiLogSummary;
  topErrors?: Array<Record<string, unknown>>;
  topSlow?: Array<Record<string, unknown>>;
  recentErrorSamples?: ApiLogSample[];
  recentSlowSamples?: ApiLogSample[];
}

export interface OpsMetricsSnapshot {
  enabled: boolean;
  topErrorApis?: Array<Record<string, unknown>>;
  topSlowApis?: Array<Record<string, unknown>>;
  runtimeHealth?: RuntimeHealthSnapshot;
  jvm?: Record<string, unknown>;
  system?: Record<string, unknown>;
  rateLimitMetrics?: Record<string, unknown>;
  rateLimit?: Record<string, unknown>;
}

export interface OpsOverviewResponse {
  result: string;
  batch_status?: string;
  db_status?: string;
  metrics_status?: string;
  api_logs_status?: string;
  batch?: Record<string, unknown>;
  db?: Record<string, unknown>;
  metrics?: OpsMetricsSnapshot;
  api_logs?: ApiLogDiagnostics;
  health?: OpsHealthSummary;
}

/**
 * Admin 대시보드 관련 타입
 */
export interface AdminMenuCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
}

export interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  subtitle?: string;
}

export interface MenuCategory {
  title: string;
  items: AdminMenuItem[];
}

export interface AdminMenuItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}