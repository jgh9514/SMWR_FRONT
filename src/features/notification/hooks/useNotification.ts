/**
 * 알림 관련 Hook
 */

import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { useApiPostMutation } from '@/hooks/api/useApiMutation';
import type {
  NotificationListResponse,
  MarkNotificationReadParams,
  MarkNotificationReadResponse,
} from '@/features/notification/types/notification';

/**
 * 알림 목록 조회
 * 백엔드: POST /api/v1/notification/list
 */
export const useNotificationList = (
  options?: Parameters<typeof useApiPostQuery<NotificationListResponse>>[2],
) => {
  return useApiPostQuery<NotificationListResponse>(
    '/notification/list',
    {},
    {
      enabled: true,
      refetchOnWindowFocus: true,
      ...options,
    },
  );
};

/**
 * 알림 읽음 처리
 * 백엔드: POST /api/v1/notification/read
 */
export const useMarkNotificationRead = (
  options?: Parameters<typeof useApiPostMutation<MarkNotificationReadResponse, MarkNotificationReadParams>>[1],
) => {
  return useApiPostMutation<MarkNotificationReadResponse, MarkNotificationReadParams>(
    '/notification/read',
    options,
  );
};

/**
 * 모든 알림 읽음 처리
 * 백엔드: POST /api/v1/notification/read-all
 */
export const useMarkAllNotificationsRead = (
  options?: Parameters<typeof useApiPostMutation<{ result: string }, unknown>>[1],
) => {
  return useApiPostMutation<{ result: string }, unknown>(
    '/notification/read-all',
    options,
  );
};

