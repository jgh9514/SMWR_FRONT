/**
 * 인증 관련 Hook
 */

import { useApiPostMutation, useApiMutation } from '@/hooks/api/useApiMutation';
import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { isAuthenticated } from '@/shared/utils/auth';
import {
  LoginParams,
  LoginResponse,
  AuthCheckResponse,
  ApiResult,
  GuildApplicationParams,
  GuildApplicationResponse,
  GuildSearchParams,
  GuildSearchItem,
  UserGuildInfo,
  SignupParams,
  SignupResponse,
  GuildApplicationItem,
  ProcessGuildApplicationParams,
  GuildSettings,
  GuildMember,
  GuildJoinApplication,
  MyGuildJoinApplicationStatusResponse,
  GuildInviteCheckResponse,
  UpdateGuildMemberRoleParams,
  TransferGuildLeadershipParams,
  KickGuildMemberParams,
  UpdateGuildMemberNameParams,
  SendEmailVerificationParams,
  VerifyEmailCodeParams,
  EmailVerificationResponse,
  CheckUserIdDuplicateParams,
  CheckUserIdDuplicateResponse,
  FindUserIdParams,
  FindUserIdResponse,
  FindPasswordParams,
  FindPasswordResponse,
} from '@/types';

/**
 * 로그인 Mutation
 */
export const useLogin = (options?: Parameters<typeof useApiPostMutation<LoginResponse, LoginParams>>[1]) => {
  return useApiPostMutation<LoginResponse, LoginParams>('/auth/login', {
    retry: false, // 429 에러 방지를 위해 재시도 비활성화
    ...options,
  });
};

/**
 * 자동 로그인 체크 Mutation
 */
export const useAutoLogin = (options?: Parameters<typeof useApiPostMutation<AuthCheckResponse, unknown>>[1]) => {
  return useApiPostMutation<AuthCheckResponse, unknown>('/auth/login-check', options);
};

/**
 * 로그아웃 Mutation
 * 백엔드: /api/v1/auth/logout
 */
export const useLogout = (options?: Parameters<typeof useApiPostMutation<boolean, unknown>>[1]) => {
  return useApiPostMutation<boolean, unknown>('/auth/logout', options);
};

/**
 * 길드 신청 Mutation (길드장이 신청 - 길드와 계정을 함께 생성)
 * 백엔드: /api/v1/smw/guild/application/save
 * 파일 업로드를 포함한 길드 생성 신청
 */
export const useGuildApplication = (
  options?: Parameters<typeof useApiPostMutation<GuildApplicationResponse, GuildApplicationParams>>[1],
) => {
  return useApiMutation<GuildApplicationResponse, GuildApplicationParams, Error>({
    mutationFn: async (variables: GuildApplicationParams) => {
      // FormData 생성 (user_id는 세션에서 처리하므로 제외)
      const formData = new FormData();
      formData.append('guild_name', variables.guild_name);
      
      // 파일 추가
      if (variables.json_file) {
        formData.append('json_file', variables.json_file);
      }
      if (variables.image_file) {
        formData.append('image_file', variables.image_file);
      }

      // apiClient 사용 (FormData 자동 처리)
      const { apiClient } = await import('@/shared/lib/api/client');
      const response = await apiClient.post<GuildApplicationResponse>('/smw/guild/application/save', formData);
      
      return response;
    },
    ...options,
  });
};

/**
 * 길드 검색 Query
 * 백엔드: /api/v1/smw/guild/search
 * 응답: List<Map<String, ?>>를 직접 반환
 */
export const useGuildSearch = (
  params: GuildSearchParams,
  options?: Omit<Parameters<typeof useApiPostQuery<GuildSearchItem[]>>[2], 'enabled'>,
) => {
  return useApiPostQuery<GuildSearchItem[]>('/smw/guild/search', params, {
    enabled: !!params.guild_name && params.guild_name.length >= 2,
    ...options,
  });
};

/**
 * 일반 회원가입 Mutation
 * 백엔드: /api/v1/auth/signup
 */
export const useSignup = (options?: Parameters<typeof useApiPostMutation<SignupResponse, SignupParams>>[1]) => {
  return useApiPostMutation<SignupResponse, SignupParams>('/auth/signup', options);
};

/**
 * 사용자 길드 조회 Query
 * 백엔드: /api/v1/smw/guild/user-guild
 * 로그인 상태일 때만 조회
 */
export const useUserGuild = (
  options?: Parameters<typeof useApiPostQuery<UserGuildInfo>>[2],
) => {
  // 로그인 상태 확인 (역할을 드러내고 구현은 숨김)
  const hasToken = typeof window !== 'undefined' ? isAuthenticated() : false;
  
  return useApiPostQuery<UserGuildInfo>('/smw/guild/user-guild', {}, {
    ...options,
    enabled: hasToken && (options?.enabled !== false), // 로그인 상태일 때만 조회
  });
};

/**
 * 길드 가입 Mutation
 * 백엔드: /api/v1/smw/guild/join
 */
export const useJoinGuild = (options?: Parameters<typeof useApiPostMutation<ApiResult, { guild_id: string }>>[1]) => {
  return useApiPostMutation<ApiResult, { guild_id: string }>('/smw/guild/join', options);
};

/**
 * 길드 가입 신청 Mutation (승인 대기)
 * 백엔드: /api/v1/smw/guild/join-application/save
 */
export const useApplyGuildJoinApplication = (
  options?: Parameters<typeof useApiPostMutation<ApiResult, { guild_id: string; message?: string }>>[1],
) => {
  return useApiPostMutation<ApiResult, { guild_id: string; message?: string }>('/smw/guild/join-application/save', options);
};

/**
 * 내 길드 가입 신청 상태 조회 Query (승인 대기)
 * 백엔드: /api/v1/smw/guild/join-application/my-status
 */
export const useMyGuildJoinApplicationStatus = (
  options?: Parameters<typeof useApiPostQuery<MyGuildJoinApplicationStatusResponse>>[2],
) => {
  const hasToken = typeof window !== 'undefined' ? isAuthenticated() : false;
  return useApiPostQuery<MyGuildJoinApplicationStatusResponse>('/smw/guild/join-application/my-status', {}, {
    ...options,
    enabled: hasToken && (options?.enabled !== false),
  });
};

/**
 * 길드 신청 목록 조회 Query
 * 백엔드: /api/v1/smw/guild/application/list
 * 로그인 상태일 때만 조회
 */
export const useGuildApplicationList = (
  options?: Parameters<typeof useApiPostQuery<GuildApplicationItem[]>>[2],
) => {
  // 로그인 상태 확인 (역할을 드러내고 구현은 숨김)
  const hasToken = typeof window !== 'undefined' ? isAuthenticated() : false;
  
  return useApiPostQuery<GuildApplicationItem[]>('/smw/guild/application/list', {}, {
    ...options,
    enabled: hasToken && (options?.enabled !== false), // 로그인 상태일 때만 조회
  });
};

/**
 * 길드 신청 승인/반려 Mutation
 * 백엔드: /api/v1/smw/guild/application/process
 */
export const useProcessGuildApplication = (
  options?: Parameters<typeof useApiPostMutation<ApiResult, ProcessGuildApplicationParams>>[1],
) => {
  return useApiPostMutation<ApiResult, ProcessGuildApplicationParams>('/smw/guild/application/process', options);
};

/**
 * 길드 설정 조회 Query
 * 백엔드: /api/v1/smw/guild/detail
 */
export const useGuildSettings = (
  guildId: string,
  options?: Omit<Parameters<typeof useApiPostQuery<GuildSettings>>[2], 'enabled'>,
) => {
  return useApiPostQuery<GuildSettings>('/smw/guild/detail', { guild_id: guildId }, options);
};

/**
 * 길드 설정 저장 Mutation
 * 백엔드: /api/v1/smw/guild/save
 */
export const useSaveGuildSettings = (
  options?: Parameters<typeof useApiPostMutation<ApiResult, GuildSettings>>[1],
) => {
  return useApiPostMutation<ApiResult, GuildSettings>('/smw/guild/save', options);
};

/**
 * 초대 코드 채번 Mutation
 * 백엔드: /api/v1/smw/guild/invite/generate
 */
export const useGenerateInviteCode = (
  options?: Parameters<typeof useApiPostMutation<ApiResult & { invite_code?: string; invite_key?: string }, { guild_id: string }>>[1],
) => {
  return useApiPostMutation<ApiResult & { invite_code?: string; invite_key?: string }, { guild_id: string }>('/smw/guild/invite/generate', options);
};

/**
 * 길드 멤버 목록 조회 Query
 * 백엔드: /api/v1/smw/guild/member/list
 */
export const useGuildMembers = (
  guildId: string,
  options?: Omit<Parameters<typeof useApiPostQuery<GuildMember[]>>[2], 'enabled'>,
) => {
  return useApiPostQuery<GuildMember[]>('/smw/guild/member/list', { guild_id: guildId }, options);
};

/**
 * 길드 가입 신청 목록 조회 Query (길드장/매니저용)
 * 백엔드: /api/v1/smw/guild/application/list (길드에 가입 신청한 목록)
 */
export const useGuildJoinApplicationList = (
  guildId: string,
  options?: Omit<Parameters<typeof useApiPostQuery<GuildJoinApplication[]>>[2], 'enabled'>,
) => {
  return useApiPostQuery<GuildJoinApplication[]>('/smw/guild/join-application/list', { guild_id: guildId }, options);
};

/**
 * 길드 가입 신청 승인/반려 Mutation
 * 백엔드: /api/v1/smw/guild/application/process
 */
export const useProcessGuildJoinApplication = (
  options?: Parameters<typeof useApiPostMutation<ApiResult, ProcessGuildApplicationParams>>[1],
) => {
  return useApiPostMutation<ApiResult, ProcessGuildApplicationParams>('/smw/guild/join-application/process', options);
};

/**
 * 내 길드 가입 신청 취소 Mutation
 * 백엔드: /api/v1/smw/guild/join-application/cancel
 */
export const useCancelMyGuildJoinApplication = (
  options?: Parameters<typeof useApiPostMutation<ApiResult, Record<string, never>>>[1],
) => {
  return useApiPostMutation<ApiResult, Record<string, never>>('/smw/guild/join-application/cancel', options);
};

/**
 * 길드 멤버 권한 변경 Mutation
 * 백엔드: /api/v1/smw/guild/member/role/update
 */
export const useUpdateGuildMemberRole = (
  options?: Parameters<typeof useApiPostMutation<ApiResult, UpdateGuildMemberRoleParams>>[1],
) => {
  return useApiPostMutation<ApiResult, UpdateGuildMemberRoleParams>('/smw/guild/member/role/update', options);
};

/**
 * 길드장 권한 위임 Mutation
 * 백엔드: /api/v1/smw/guild/transfer-leadership
 */
export const useTransferGuildLeadership = (
  options?: Parameters<typeof useApiPostMutation<ApiResult, TransferGuildLeadershipParams>>[1],
) => {
  return useApiPostMutation<ApiResult, TransferGuildLeadershipParams>('/smw/guild/transfer-leadership', options);
};

/**
 * 길드 멤버 추방 Mutation (길드장/매니저)
 * 백엔드: /api/v1/smw/guild/member/kick
 */
export const useKickGuildMember = (options?: Parameters<typeof useApiPostMutation<ApiResult, KickGuildMemberParams>>[1]) => {
  return useApiPostMutation<ApiResult, KickGuildMemberParams>('/smw/guild/member/kick', options);
};

/**
 * 길드 멤버 표시명 수정 Mutation (길드장/매니저)
 * 백엔드: /api/v1/smw/guild/member/name/update
 */
export const useUpdateGuildMemberName = (
  options?: Parameters<typeof useApiPostMutation<ApiResult, UpdateGuildMemberNameParams>>[1],
) => {
  return useApiPostMutation<ApiResult, UpdateGuildMemberNameParams>('/smw/guild/member/name/update', options);
};

/**
 * 초대 코드로 길드 가입 Mutation
 * 백엔드: /api/v1/smw/guild/invite/join
 */
export const useJoinGuildByInviteCode = (
  options?: Parameters<typeof useApiPostMutation<ApiResult, { invite_key: string }>>[1],
) => {
  return useApiPostMutation<ApiResult, { invite_key: string }>('/smw/guild/invite/join', options);
};

/**
 * 초대 코드로 길드 조회 Query
 * 백엔드: /api/v1/smw/guild/invite/check
 */
export const useCheckGuildByInviteCode = (
  inviteKey: string,
  options?: Omit<Parameters<typeof useApiPostQuery<GuildInviteCheckResponse>>[2], 'enabled'>,
) => {
  return useApiPostQuery<GuildInviteCheckResponse>('/smw/guild/invite/check', { invite_key: inviteKey }, options);
};

/**
 * 이메일 인증 코드 발송 Mutation
 * 백엔드: /api/v1/auth/email/send
 */
export const useSendEmailVerification = (
  options?: Parameters<typeof useApiPostMutation<EmailVerificationResponse, SendEmailVerificationParams>>[1],
) => {
  return useApiPostMutation<EmailVerificationResponse, SendEmailVerificationParams>('/auth/email/send', options);
};

/**
 * 이메일 인증 코드 확인 Mutation
 * 백엔드: /api/v1/auth/email/verify
 */
export const useVerifyEmailCode = (
  options?: Parameters<typeof useApiPostMutation<EmailVerificationResponse, VerifyEmailCodeParams>>[1],
) => {
  return useApiPostMutation<EmailVerificationResponse, VerifyEmailCodeParams>('/auth/email/verify', options);
};

/**
 * 아이디 중복체크 Mutation
 * 백엔드: /api/v1/auth/user-id/check
 */
export const useCheckUserIdDuplicate = (
  options?: Parameters<typeof useApiPostMutation<CheckUserIdDuplicateResponse, CheckUserIdDuplicateParams>>[1],
) => {
  return useApiPostMutation<CheckUserIdDuplicateResponse, CheckUserIdDuplicateParams>('/auth/user-id/check', options);
};

/**
 * 아이디 찾기 Mutation
 * 백엔드: /api/v1/auth/find/user-id
 */
export const useFindUserId = (
  options?: Parameters<typeof useApiPostMutation<FindUserIdResponse, FindUserIdParams>>[1],
) => {
  return useApiPostMutation<FindUserIdResponse, FindUserIdParams>('/auth/find/user-id', options);
};

/**
 * 비밀번호 찾기 Mutation
 * 백엔드: /api/v1/auth/find/password
 */
export const useFindPassword = (
  options?: Parameters<typeof useApiPostMutation<FindPasswordResponse, FindPasswordParams>>[1],
) => {
  return useApiPostMutation<FindPasswordResponse, FindPasswordParams>('/auth/find/password', options);
};

/**
 * siege_view_scope 업데이트 Mutation
 * 백엔드: /api/v1/sm/user/update-siege-scope
 */
export const useUpdateSiegeViewScope = (
  options?: Parameters<typeof useApiPostMutation<ApiResult, { siege_view_scope: string }>>[1],
) => {
  return useApiPostMutation<ApiResult, { siege_view_scope: string }>('/sm/user/update-siege-scope', options);
};

