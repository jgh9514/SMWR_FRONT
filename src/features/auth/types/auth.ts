/**
 * 인증 관련 타입 정의
 */

export interface LoginParams {
  user_id: string;
  password: string;
  auto_login: string;
}

/**
 * 사용자 정보 (localStorage에 저장되는 구조)
 */
export interface UserInfo {
  user_id: string;
  user_name?: string;
  user_nm?: string;
  email?: string;
  guild_id?: string;
  guild_name?: string;
  guild_role?: 'LEADER' | 'MANAGER' | 'MEMBER';
  roles?: Array<{
    role_id: string;
    role_nm?: string;
    role_desc?: string;
  }>;
}

export interface LoginResponse {
  result: string;
  userInfo?: UserInfo;
}

export interface AuthCheckResponse {
  result: string;
  userInfo?: UserInfo;
}

/**
 * 길드 신청 파라미터 (길드장이 신청)
 */
export interface GuildApplicationParams {
  guild_name: string;
  user_id: string;
  password: string;
  user_name: string;
  json_file?: File; // JSON 파일
  image_file?: File; // 이미지 파일
}

/**
 * 길드 검색 파라미터
 */
export interface GuildSearchParams {
  guild_name: string;
}

/**
 * 길드 검색 결과
 * 백엔드에서 List<Map<String, ?>>를 직접 반환
 */
export interface GuildSearchItem {
  guild_id: string;
  guild_name: string;
  leader_name?: string;
  rating?: number;
}

/**
 * 일반 회원가입 파라미터
 */
export interface SignupParams {
  user_id: string;
  password: string;
  // 닉네임 입력을 제거했으므로 선택값으로 처리 (백엔드에서 비어있으면 user_id로 기본값 설정)
  user_name?: string;
  email: string;
}

/**
 * 이메일 인증 코드 발송 파라미터
 */
export interface SendEmailVerificationParams {
  email: string;
}

/**
 * 이메일 인증 코드 확인 파라미터
 */
export interface VerifyEmailCodeParams {
  email: string;
  code: string;
}

/**
 * 이메일 인증 응답
 */
export interface EmailVerificationResponse {
  result: string;
  message?: string;
  dev_code?: string; // 개발 환경에서만 반환
}

/**
 * 회원가입 응답
 */
export interface SignupResponse {
  result: string;
  message?: string;
}

/**
 * 아이디 중복체크 파라미터
 */
export interface CheckUserIdDuplicateParams {
  user_id: string;
}

/**
 * 아이디 중복체크 응답
 */
export interface CheckUserIdDuplicateResponse {
  result: string;
  message?: string;
  isDuplicate?: boolean;
}

/**
 * 길드 신청 응답
 */
export interface GuildApplicationResponse {
  result: string;
  message?: string;
  guild_id?: string;
}

/**
 * 사용자 길드 정보
 */
export interface UserGuildInfo {
  guild_id?: string;
  guild_name?: string;
  role?: string; // 'LEADER' | 'MEMBER'
}

/**
 * 길드 신청 목록 항목
 */
export interface GuildApplicationItem {
  application_id?: string;
  guild_id?: string;
  guild_name?: string;
  user_id?: string;
  user_name?: string;
  status?: string; // 'PENDING' | 'APPROVED' | 'REJECTED'
  crt_date?: string;
  json_file_url?: string; // JSON 파일 URL
  image_file_url?: string; // 이미지 파일 URL
}

/**
 * 길드 신청 승인/반려 파라미터
 */
export interface ProcessGuildApplicationParams {
  application_id: string;
  status: 'APPROVED' | 'REJECTED';
  message?: string;
}

/**
 * 길드 설정 정보
 */
export interface GuildSettings {
  guild_id?: string;
  guild_name?: string;
  auto_approve?: boolean; // 자동 승인 여부
  join_type?: string; // 'APPROVAL' | 'INVITE' (APPROVAL: 승인 필요, INVITE: 초대 코드로만 가입)
  max_members?: number;
  description?: string;
  invite_code?: string;
  invite_key?: string; // 백엔드에서 반환하는 초대 코드 필드명
  regenerate_invite_code?: boolean; // 초대 코드 재생성 플래그
  crt_date?: string;
}

/**
 * 길드 멤버 정보
 */
export interface GuildMember {
  user_id?: string;
  user_name?: string;
  user_nm?: string;
  guild_role?: string; // 'LEADER' | 'MANAGER' | 'MEMBER'
  join_date?: string;
  crt_date?: string;
}

/**
 * 길드 가입 신청 정보 (길드에 가입 신청)
 */
export interface GuildJoinApplication {
  application_id?: string;
  user_id?: string;
  user_name?: string;
  user_nm?: string;
  guild_id?: string;
  guild_name?: string;
  status?: string; // 'PENDING' | 'APPROVED' | 'REJECTED'
  crt_date?: string;
}

export interface MyGuildJoinApplicationStatusResponse {
  result: string;
  hasPendingJoinApplication: boolean;
  application?: GuildJoinApplication;
  message?: string;
}

/**
 * 길드 멤버 권한 변경 파라미터
 */
export interface UpdateGuildMemberRoleParams {
  user_id: string;
  guild_role: 'LEADER' | 'MANAGER' | 'MEMBER';
}

/**
 * 길드장 권한 위임 파라미터
 */
export interface TransferGuildLeadershipParams {
  new_leader_user_id: string;
}

export interface KickGuildMemberParams {
  user_id: string;
  leave_reason?: string;
}

/**
 * 아이디 찾기 파라미터
 */
export interface FindUserIdParams {
  email: string;
}

/**
 * 아이디 찾기 응답
 */
export interface FindUserIdResponse {
  result: string;
  message?: string;
  user_id?: string;
}

/**
 * 비밀번호 찾기 파라미터
 */
export interface FindPasswordParams {
  user_id: string;
  email: string;
}

/**
 * 비밀번호 찾기 응답
 */
export interface FindPasswordResponse {
  result: string;
  message?: string;
}

