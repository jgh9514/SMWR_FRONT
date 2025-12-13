/**
 * 공지사항 및 1대1문의 관련 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { useApiPostMutation } from '@/hooks/api/useApiMutation';
import {
  NoticeListParams,
  NoticeListResponse,
  Notice,
  NoticeParams,
  InquiryListParams,
  InquiryListResponse,
  Inquiry,
  InquiryParams,
  InquiryAnswerParams,
} from '@/features/community/types/community';

/**
 * 공지사항 목록 조회 Query
 * 백엔드: /api/v1/community/notice/list
 */
export const useNoticeList = (
  params: NoticeListParams,
  options?: Omit<Parameters<typeof useApiPostQuery<NoticeListResponse>>[2], 'enabled'>,
) => {
  return useApiPostQuery<NoticeListResponse>('/community/notice/list', params, {
    enabled: true,
    ...options,
  });
};

/**
 * 공지사항 상세 조회 Query
 * 백엔드: /api/v1/community/notice/detail
 */
export const useNoticeDetail = (
  noticeId: string,
  options?: Omit<Parameters<typeof useApiPostQuery<Notice>>[2], 'enabled'>,
) => {
  return useApiPostQuery<Notice>('/community/notice/detail', { notice_id: noticeId }, options);
};

/**
 * 공지사항 작성 Mutation
 * 백엔드: /api/v1/community/notice/save
 */
export const useSaveNotice = (
  options?: Parameters<typeof useApiPostMutation<any, NoticeParams>>[1],
) => {
  return useApiPostMutation<any, NoticeParams>('/community/notice/save', options);
};

/**
 * 공지사항 삭제 Mutation
 * 백엔드: /api/v1/community/notice/delete
 */
export const useDeleteNotice = (
  options?: Parameters<typeof useApiPostMutation<any, { notice_id: string }>>[1],
) => {
  return useApiPostMutation<any, { notice_id: string }>('/community/notice/delete', options);
};

/**
 * 공지사항 조회수 증가 Mutation
 * 백엔드: /api/v1/community/notice/view
 */
export const useIncreaseNoticeView = (
  options?: Parameters<typeof useApiPostMutation<any, { notice_id: string }>>[1],
) => {
  return useApiPostMutation<any, { notice_id: string }>('/community/notice/view', options);
};

/**
 * 팝업 공지사항 목록 조회 Query
 * 백엔드: /api/v1/community/notice/popup/list
 */
export const usePopupNoticeList = (
  options?: Parameters<typeof useApiPostQuery<{ list: Notice[] }>>[2],
) => {
  return useApiPostQuery<{ list: Notice[] }>('/community/notice/popup/list', {}, {
    enabled: true,
    ...options,
  });
};

/**
 * 팝업 공지사항 조회 기록 저장 Mutation
 * 백엔드: /api/v1/community/notice/popup/view
 */
export const useSavePopupNoticeView = (
  options?: Parameters<typeof useApiPostMutation<any, { notice_id: string }>>[1],
) => {
  return useApiPostMutation<any, { notice_id: string }>('/community/notice/popup/view', options);
};

/**
 * 1대1문의 목록 조회 Query
 * 백엔드: /api/v1/community/inquiry/list
 */
export const useInquiryList = (
  params: InquiryListParams,
  options?: Omit<Parameters<typeof useApiPostQuery<InquiryListResponse>>[2], 'enabled'>,
) => {
  return useApiPostQuery<InquiryListResponse>('/community/inquiry/list', params, options);
};

/**
 * 1대1문의 상세 조회 Query
 * 백엔드: /api/v1/community/inquiry/detail
 */
export const useInquiryDetail = (
  inquiryId: string,
  options?: Omit<Parameters<typeof useApiPostQuery<Inquiry>>[2], 'enabled'>,
) => {
  return useApiPostQuery<Inquiry>('/community/inquiry/detail', { inquiry_id: inquiryId }, options);
};

/**
 * 1대1문의 작성 Mutation
 * 백엔드: /api/v1/community/inquiry/save
 */
export const useSaveInquiry = (
  options?: Parameters<typeof useApiPostMutation<any, InquiryParams>>[1],
) => {
  return useApiPostMutation<any, InquiryParams>('/community/inquiry/save', options);
};

/**
 * 1대1문의 답변 Mutation (관리자)
 * 백엔드: /api/v1/community/inquiry/answer
 */
export const useAnswerInquiry = (
  options?: Parameters<typeof useApiPostMutation<any, InquiryAnswerParams>>[1],
) => {
  return useApiPostMutation<any, InquiryAnswerParams>('/community/inquiry/answer', options);
};

/**
 * 1대1문의 삭제 Mutation
 * 백엔드: /api/v1/community/inquiry/delete
 */
export const useDeleteInquiry = (
  options?: Parameters<typeof useApiPostMutation<any, { inquiry_id: string }>>[1],
) => {
  return useApiPostMutation<any, { inquiry_id: string }>('/community/inquiry/delete', options);
};

