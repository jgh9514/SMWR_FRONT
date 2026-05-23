'use client';

import type { ReactNode } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import GroupIcon from '@mui/icons-material/Group';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import AnnouncementIcon from '@mui/icons-material/Announcement';
import CircleIcon from '@mui/icons-material/Circle';
import type { NotificationItem } from '@/features/notification/types/notification';
import { formatNotificationTime, isNotificationUnread } from '@/features/notification/lib/notificationUtils';

function getNotificationIcon(type: string) {
  switch (type) {
    case 'GUILD_MEMBER_JOINED':
    case 'GUILD_MEMBER_LEFT':
    case 'GUILD_APPLICATION_PENDING':
    case 'GUILD_JOIN_APPLICATION_PENDING':
    case 'GUILD_JOIN_APPLICATION_APPROVED':
      return <GroupIcon fontSize="small" />;
    case 'INQUIRY_PENDING':
    case 'INQUIRY_ANSWERED':
      return <QuestionAnswerIcon fontSize="small" />;
    case 'NOTICE_NEW':
      return <AnnouncementIcon fontSize="small" />;
    default:
      return <NotificationsIcon fontSize="small" />;
  }
}

export interface NotificationListPanelProps {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading?: boolean;
  isClient?: boolean;
  maxHeight?: number | string;
  onItemClick: (notification: NotificationItem) => void;
  onDismiss: (notificationId: string) => void;
  onMarkAllRead: () => void;
  markAllReadPending?: boolean;
  dismissingId?: string | null;
  showHeader?: boolean;
  headerActions?: ReactNode;
  emptyMessage?: string;
}

export default function NotificationListPanel({
  notifications,
  unreadCount,
  isLoading = false,
  isClient = true,
  maxHeight = 400,
  onItemClick,
  onDismiss,
  onMarkAllRead,
  markAllReadPending = false,
  dismissingId = null,
  showHeader = true,
  headerActions,
  emptyMessage = '알림이 없습니다',
}: NotificationListPanelProps) {
  return (
    <Box>
      {showHeader && (
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: 'divider',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              알림
            </Typography>
            {unreadCount > 0 && (
              <Chip label={`${unreadCount}건 미읽음`} size="small" color="primary" variant="outlined" />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={onMarkAllRead}
                disabled={markAllReadPending}
                sx={{ fontSize: '0.75rem', minWidth: 'auto', px: 1 }}
              >
                {markAllReadPending ? '처리 중...' : '전체 읽음'}
              </Button>
            )}
            {headerActions}
          </Box>
        </Box>
      )}

      <Box sx={{ maxHeight, overflow: 'auto' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              로딩 중...
            </Typography>
          </Box>
        ) : notifications.length > 0 ? (
          <List sx={{ p: 0 }}>
            {notifications.map((notification) => {
              const unread = isNotificationUnread(notification);
              return (
                <ListItem
                  key={notification.notification_id}
                  disablePadding
                  secondaryAction={
                    <IconButton
                      edge="end"
                      size="small"
                      aria-label="알림 숨기기"
                      disabled={dismissingId === notification.notification_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDismiss(notification.notification_id);
                      }}
                      sx={{ mr: 0.5 }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  }
                  sx={{
                    bgcolor: unread ? 'action.hover' : 'transparent',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.selected' },
                  }}
                >
                  <ListItemButton onClick={() => onItemClick(notification)} sx={{ py: 1.5, px: 2, pr: 6 }}>
                    <ListItemAvatar sx={{ minWidth: 40 }}>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: unread ? 'primary.main' : 'action.disabledBackground',
                          color: unread ? 'primary.contrastText' : 'action.disabled',
                        }}
                      >
                        {getNotificationIcon(notification.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: unread ? 600 : 400, flex: 1 }}>
                            {notification.title}
                          </Typography>
                          {unread && <CircleIcon sx={{ fontSize: 8, color: 'primary.main', flexShrink: 0 }} />}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: 'block',
                              mb: 0.5,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {notification.content}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {formatNotificationTime(notification.crt_date, isClient)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, px: 2 }}>
            <NotificationsNoneIcon sx={{ fontSize: 48, color: 'action.disabled', mb: 2 }} />
            <Typography variant="body2" color="text.secondary" align="center">
              {emptyMessage}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
