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
}

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

export interface MenuItem {
  menu_id: string;
  menu_nm: string;
  menu_lv?: number;
  up_menu_id?: string;
  menu_url?: string;
  menu_icon?: string;
  srt_sn?: string;
  srt_path?: string;
  use_yn?: string;
  usg_yn?: string;
  crt_date?: string;
  upd_date?: string;
  row_status?: string;
}

export interface ApiItem {
  api_id: string;
  api_nm: string;
  api_exe_url: string;
  api_txt?: string;
  api_url?: string;
  api_desc?: string;
  bsns_cd?: string;
  bsns_cd_nm?: string;
  usg_yn?: string;
  crt_date?: string;
  upd_date?: string;
  row_status?: string;
}

export interface CodeGroup {
  id?: string;
  cd_grp_no: string;
  cd_grp_nm: string;
  bsns_cd?: string;
  dtl_bsns_cd?: string;
  row_status?: string;
}

export interface CodeItem {
  id: string;
  cd_grp_no: string;
  cd_grp_nm?: string;
  cd: string;
  cd_nm: string;
  srt_sn?: string;
  buf_fst_txt?: string;
  buf_snd_txt?: string;
  buf_trd_txt?: string;
  buf_fth_txt?: string;
  buf_ffh_txt?: string;
  row_status?: string;
}

export interface CodeSaveRequest {
  insertRow: CodeItem[];
  updateRow: CodeItem[];
  deleteRow: CodeItem[];
}

export interface CodeRelSaveRequest {
  insertRow: ParentItem[];
  updateRow: ParentItem[];
  deleteRow: ParentItem[];
}

export interface CodeRelSaveResponse {
  result: string;
  message?: string;
}

export interface ParentItem {
  cd_grp_no: string;
  cd_grp_nm?: string;
  cd: string;
  cd_nm: string;
  children?: ChildItem[];
}

export interface ChildItem {
  id?: string;
  cd_grp_no: string;
  cd_grp_nm?: string;
  cd: string;
  cd_nm: string;
  up_cd: string;
  row_status?: string;
}

export interface PopupItem {
  cd_grp_no: string;
  cd: string;
  cd_nm: string;
}

export interface PageItem {
  page_id: string;
  page_nm: string;
  page_url?: string;
  page_desc?: string;
  crt_date?: string;
  upd_date?: string;
  row_status?: string;
}

export interface ConditionItem {
  id?: string;
  condition_id: string;
  cond_id?: string;
  page_id: string;
  condition_nm: string;
  cond_nm?: string;
  condition_type?: string;
  cond_tp_cd?: string;
  condition_value?: string;
  mdat_yn?: string;
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

export type CommonCodeList = {
  CO00000001: {
    cd: string[];
    cd_nm: string[];
    up_cd?: string[];
  };
  CO00000002?: {
    cd: string[];
    cd_nm: string[];
    up_cd?: string[];
  };
  CO00000004?: {
    cd: string[];
    cd_nm: string[];
    up_cd?: string[];
  };
  CO00000005?: {
    cd: string[];
    cd_nm: string[];
    up_cd?: string[];
  };
  CO00000008?: {
    cd: string[];
    cd_nm: string[];
    up_cd?: string[];
  };
};

export type BsnsDtlCd = {
  id: string;
  levels: number;
  tags: string[];
  keys: Array<[string, string]>;
  values: string[];
};

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
}

/**
 * DDL Comparison 관련 타입
 */

// 컬럼 정보
export interface ColumnInfo {
  columnName: string;
  dataType: string;
  nullable: boolean;
  defaultValue?: string;
  comment?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
}

// 테이블 정보
export interface TableInfo {
  tableName: string;
  comment?: string;
  columns: ColumnInfo[];
  primaryKeys?: string[];
  foreignKeys?: string[];
  indexes?: string[];
}

// DB 테이블 조회 응답
export interface DbTablesResponse {
  schema: string;
  tables: TableInfo[];
  totalCount: number;
}

// Entity 테이블 조회 응답
export interface EntityTablesResponse {
  entities: TableInfo[];
  totalCount: number;
}

// 차이점 정보
export interface DifferenceInfo {
  type: 'missing_in_db' | 'missing_in_entity' | 'column_mismatch' | 'type_mismatch';
  tableName: string;
  columnName?: string;
  dbValue?: string;
  entityValue?: string;
  description: string;
}

// DDL 비교 결과
export interface DdlComparisonResult {
  schema: string;
  matchedTables: string[];
  missingInDb: string[];
  missingInEntity: string[];
  differences: DifferenceInfo[];
  summary: {
    totalDbTables: number;
    totalEntityTables: number;
    matchedCount: number;
    differenceCount: number;
  };
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