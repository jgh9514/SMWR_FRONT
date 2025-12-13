/**
 * 댓글 관련 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { useApiPostMutation } from '@/hooks/api/useApiMutation';
import {
  CommentListParams,
  CommentListResponse,
  CommentSaveParams,
  CommentUpdateParams,
  CommentDeleteParams,
  CommentResponse,
} from '@/features/community/types/comment';

/**
 * 댓글 목록 조회 Query
 * 백엔드: /api/v1/community/comment/list
 */
export const useCommentList = (
  params: CommentListParams,
  options?: Omit<Parameters<typeof useApiPostQuery<CommentListResponse>>[2], 'enabled'>,
) => {
  return useApiPostQuery<CommentListResponse>('/community/comment/list', params, {
    enabled: true,
    ...options,
  });
};

/**
 * 댓글 등록 Mutation
 * 백엔드: /api/v1/community/comment/save
 */
export const useSaveComment = (
  options?: Parameters<typeof useApiPostMutation<CommentResponse, CommentSaveParams>>[1],
) => {
  return useApiPostMutation<CommentResponse, CommentSaveParams>('/community/comment/save', options);
};

/**
 * 댓글 수정 Mutation
 * 백엔드: /api/v1/community/comment/update
 */
export const useUpdateComment = (
  options?: Parameters<typeof useApiPostMutation<CommentResponse, CommentUpdateParams>>[1],
) => {
  return useApiPostMutation<CommentResponse, CommentUpdateParams>('/community/comment/update', options);
};

/**
 * 댓글 삭제 Mutation
 * 백엔드: /api/v1/community/comment/delete
 */
export const useDeleteComment = (
  options?: Parameters<typeof useApiPostMutation<CommentResponse, CommentDeleteParams>>[1],
) => {
  return useApiPostMutation<CommentResponse, CommentDeleteParams>('/community/comment/delete', options);
};

