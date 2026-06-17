'use client';

import { useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Card, CardContent, Container, Alert } from '@mui/material';
import { PageHeader } from '@/shared/ui';
import { isAuthenticated } from '@/shared/utils/auth';
import { showToast } from '@/shared/lib/notification';
import { getApiResultMessage, isApiSuccess } from '@/shared/lib/api/result';
import {
  useNotificationList,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDismissNotification,
} from '@/features/notification/hooks/useNotification';
import NotificationListPanel from '@/features/notification/components/NotificationListPanel';
import type { NotificationItem } from '@/features/notification/types/notification';
import { isNotificationUnread } from '@/features/notification/lib/notificationUtils';

export default function NotificationsPageClient() {
  const router = useRouter();
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const loggedIn = isClient && isAuthenticated();

  const notificationListQuery = useNotificationList({
    enabled: loggedIn,
    refetchOnWindowFocus: true,
  });

  const markReadMutation = useMarkNotificationRead({
    onSuccess: () => {
      notificationListQuery.refetch();
    },
  });

  const markAllReadMutation = useMarkAllNotificationsRead({
    onSuccess: (res) => {
      if (isApiSuccess(res)) {
        showToast.success(getApiResultMessage(res, '모든 알림을 읽음 처리했습니다.'));
        notificationListQuery.refetch();
      } else {
        showToast.error(getApiResultMessage(res, '전체 읽음 처리에 실패했습니다.'));
      }
    },
    onError: () => {
      showToast.error('전체 읽음 처리에 실패했습니다.');
    },
  });

  const dismissMutation = useDismissNotification({
    onSuccess: (res) => {
      if (isApiSuccess(res)) {
        notificationListQuery.refetch();
      } else {
        showToast.error(getApiResultMessage(res, '알림을 숨기지 못했습니다.'));
      }
    },
    onError: () => {
      showToast.error('알림을 숨기지 못했습니다.');
    },
  });

  const handleItemClick = (notification: NotificationItem) => {
    if (isNotificationUnread(notification)) {
      markReadMutation.mutate({ notification_id: notification.notification_id });
    }
    if (notification.related_url) {
      router.push(notification.related_url);
    }
  };

  const handleDismiss = (notificationId: string) => {
    dismissMutation.mutate({ notification_id: notificationId });
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate({});
  };

  if (!isClient) {
    return null;
  }

  if (!loggedIn) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          알림은 로그인 후 확인할 수 있습니다.
        </Alert>
        <Button variant="contained" onClick={() => router.push('/login')}>
          로그인
        </Button>
      </Container>
    );
  }

  const list = notificationListQuery.data?.list ?? [];
  const unreadCount = notificationListQuery.data?.unreadCount ?? 0;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: { xs: 4, md: 6 } }}>
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 4 } }}>
        <PageHeader title="알림" backPath="/" />

        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <NotificationListPanel
              notifications={list}
              unreadCount={unreadCount}
              isLoading={notificationListQuery.isLoading}
              isClient={isClient}
              maxHeight="none"
              onItemClick={handleItemClick}
              onDismiss={handleDismiss}
              onMarkAllRead={handleMarkAllRead}
              markAllReadPending={markAllReadMutation.isPending}
              dismissingId={dismissMutation.isPending ? dismissMutation.variables?.notification_id ?? null : null}
              showHeader
            />
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
