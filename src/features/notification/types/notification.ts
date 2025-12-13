/**
 * 알림 관련 타입 정의
 */

/**
 * 알림 타입
 */
export type NotificationType = 
  | 'GUILD_MEMBER_JOINED'      // 길드원 가입
  | 'GUILD_MEMBER_LEFT'         // 길드원 탈퇴
  | 'GUILD_APPLICATION_PENDING' // 길드 신청 대기 (관리자용)
  | 'INQUIRY_PENDING'            // 1대1 문의 대기 (관리자용)
  | 'INQUIRY_ANSWERED'           // 1대1 문의 답변 완료
  | 'NOTICE_NEW'                 // 새 공지사항
  | 'SYSTEM';                    // 시스템 알림

/**
 * 알림 항목
 */
export interface NotificationItem {
  notification_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  content: string;
  related_id?: string; // 관련 ID (예: inquiry_id, guild_application_id 등)
  related_url?: string; // 관련 URL
  is_read: boolean;
  crt_date: string;
  read_date?: string;
}

/**
 * 알림 목록 응답
 */
export interface NotificationListResponse {
  list: NotificationItem[];
  unreadCount: number;
  total: number;
}

/**
 * 알림 읽음 처리 파라미터
 */
export interface MarkNotificationReadParams {
  notification_id: string;
}

/**
 * 알림 읽음 처리 응답
 */
export interface MarkNotificationReadResponse {
  result: string; // 'SUCCESS' | 'FAIL'
}

