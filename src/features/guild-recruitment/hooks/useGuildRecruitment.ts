import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { useApiPostMutation } from '@/hooks/api/useApiMutation';
import type { ApiResult } from '@/features/auth/types/auth';
import type {
  GuildRecruitmentListParams,
  GuildRecruitmentListResponse,
  GuildRecruitmentDetail,
  GuildRecruitmentSaveParams,
  GuildRecruitmentSaveResponse,
  GuildRecruitmentImageUploadResponse,
} from '@/features/guild-recruitment/types';
import { apiClient } from '@/shared/lib/api/client';

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

export async function uploadGuildRecruitmentImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<GuildRecruitmentImageUploadResponse>(
    '/community/guild-recruitment/upload-image',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  if (res.result !== 'SUCCESS' || !res.url) {
    throw new Error(res.message || '이미지 업로드에 실패했습니다.');
  }
  return res.url;
}
