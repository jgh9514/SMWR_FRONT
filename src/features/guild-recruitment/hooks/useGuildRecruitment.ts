import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { useApiPostMutation } from '@/hooks/api/useApiMutation';
import type { ApiResult } from '@/features/auth/types/auth';
import type {
  GuildRecruitmentListParams,
  GuildRecruitmentListResponse,
  GuildRecruitmentDetail,
  GuildRecruitmentSaveParams,
  GuildRecruitmentSaveResponse,
} from '@/features/guild-recruitment/types';

export function useGuildRecruitmentList(
  params: GuildRecruitmentListParams,
  options?: Omit<Parameters<typeof useApiPostQuery<GuildRecruitmentListResponse>>[2], 'enabled'>,
) {
  return useApiPostQuery<GuildRecruitmentListResponse>('/community/guild-recruitment/list', params, {
    enabled: true,
    ...options,
  });
}

export function useGuildRecruitmentDetail(
  postId: string | undefined,
  options?: Omit<Parameters<typeof useApiPostQuery<GuildRecruitmentDetail | null>>[2], 'enabled'>,
) {
  return useApiPostQuery<GuildRecruitmentDetail | null>(
    '/community/guild-recruitment/detail',
    postId ? { post_id: postId } : {},
    {
      enabled: !!postId,
      ...options,
    },
  );
}

export function useSaveGuildRecruitment(
  options?: Parameters<typeof useApiPostMutation<GuildRecruitmentSaveResponse, GuildRecruitmentSaveParams>>[1],
) {
  return useApiPostMutation<GuildRecruitmentSaveResponse, GuildRecruitmentSaveParams>(
    '/community/guild-recruitment/save',
    options,
  );
}

export function useDeleteGuildRecruitment(
  options?: Parameters<typeof useApiPostMutation<ApiResult, { post_id: string | number }>>[1],
) {
  return useApiPostMutation<ApiResult, { post_id: string | number }>('/community/guild-recruitment/delete', options);
}
