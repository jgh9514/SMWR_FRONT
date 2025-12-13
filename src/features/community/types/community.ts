/**
 * 공지사항 및 1대1문의 관련 타입 정의
 */

/**
 * 공지사항 목록 조회 파라미터
 */
export interface NoticeListParams {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * 공지사항 정보
 */
export interface Notice {
  notice_id?: string;
  title?: string;
  content?: string;
  is_important?: boolean; // 중요 공지 여부
  is_popup?: boolean; // 팝업 공지 여부
  view_count?: number;
  crt_user_id?: string;
  crt_date?: string;
  upt_user_id?: string;
  upt_date?: string;
  user_name?: string; // 작성자명
}

/**
 * 공지사항 목록 응답
 */
export interface NoticeListResponse {
  list: Notice[];
  total: number;
  page: number;
  limit: number;
}

/**
 * 공지사항 작성/수정 파라미터
 */
export interface NoticeParams {
  notice_id?: string;
  title: string;
  content: string;
  is_important?: boolean;
  is_popup?: boolean; // 팝업 공지 여부
}

/**
 * 1대1문의 목록 조회 파라미터
 */
export interface InquiryListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string; // 'PENDING' | 'ANSWERED' | 'ALL'
}

/**
 * 1대1문의 정보
 */
export interface Inquiry {
  inquiry_id?: string;
  user_id?: string;
  user_name?: string;
  title?: string;
  content?: string;
  answer?: string;
  status?: string; // 'PENDING' | 'ANSWERED'
  answer_user_id?: string;
  answer_user_name?: string;
  crt_date?: string;
  answer_date?: string;
  upt_date?: string;
}

/**
 * 1대1문의 목록 응답
 */
export interface InquiryListResponse {
  list: Inquiry[];
  total: number;
  page: number;
  limit: number;
}

/**
 * 1대1문의 작성 파라미터
 */
export interface InquiryParams {
  title: string;
  content: string;
}

/**
 * 1대1문의 답변 파라미터
 */
export interface InquiryAnswerParams {
  inquiry_id: string;
  answer: string;
}

