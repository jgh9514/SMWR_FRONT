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
const POPUP_NOTICE_LIST_BODY: Record<string, never> = {};
export const usePopupNoticeList = (
  options?: Parameters<typeof useApiPostQuery<{ list: Notice[] }>>[2],
) => {
  // 주의: WAS 컨트롤러가 @RequestBody를 필수로 받으므로 {} body를 반드시 보낸다.
  // 또한 queryKey 안정화를 위해 {}를 매 렌더마다 새로 만들지 않고 모듈 상수를 사용한다.
  return useApiPostQuery<{ list: Notice[] }>('/community/notice/popup/list', POPUP_NOTICE_LIST_BODY, {
    enabled: true,
    // 라우팅 이동 시에도 매번 다시 가져오지 않도록 캐시를 길게 유지
    staleTime: 60 * 60 * 1000, // 1시간
    gcTime: 2 * 60 * 60 * 1000, // 2시간
    refetchOnMount: false,
    refetchOnReconnect: false,
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

