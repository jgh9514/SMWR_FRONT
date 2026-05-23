import type { NotificationItem, NotificationListResponse } from '@/features/notification/types/notification';

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/** API is_read: Y/N 또는 boolean */
export function parseNotificationRead(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toUpperCase() === 'Y';
  }
  return false;
}

export function mapNotificationListResponse(data: NotificationListResponse): NotificationListResponse {
  const list = (data.list ?? []).map((item) => ({
    ...item,
    is_read: parseNotificationRead(item.is_read),
  }));
  const unreadCount = list.filter((item) => !item.is_read).length;
  return {
    ...data,
    list,
    unreadCount: data.unreadCount ?? unreadCount,
    total: data.total ?? list.length,
  };
}

export function formatNotificationTime(dateString: string, isClient = true): string {
  if (!isClient || !dateString) {
    return '';
  }
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / MS_PER_MINUTE);
    const diffHours = Math.floor(diffMs / MS_PER_HOUR);
    const diffDays = Math.floor(diffMs / MS_PER_DAY);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}

export function isNotificationUnread(notification: NotificationItem): boolean {
  return !parseNotificationRead(notification.is_read);
}
