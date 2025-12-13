'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Divider,
  Badge,
  ListItemAvatar,
  Button,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import CastleIcon from '@mui/icons-material/Castle';
import HistoryIcon from '@mui/icons-material/History';
import BarChartIcon from '@mui/icons-material/BarChart';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import GroupIcon from '@mui/icons-material/Group';
import AnnouncementIcon from '@mui/icons-material/Announcement';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import CircleIcon from '@mui/icons-material/Circle';
import { useState, useEffect, useMemo } from 'react';
import { useResponsive } from '@/shared/hooks';
import { getMonsterImageUrl } from '@/shared/utils/image';
import { useLogout } from '@/features/auth/hooks/useAuth';
import { useUserGuild } from '@/hooks/api';
import { isAuthenticated } from '@/shared/utils/auth';
import { MS_PER_MINUTE, MS_PER_HOUR, MS_PER_DAY } from '@/shared/constants/validation';
import {
  useNotificationList,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/features/notification/hooks/useNotification';
import type { NotificationItem } from '@/features/notification/types/notification';

interface MenuItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  requiresGuild?: boolean;
  requiresLeaderOrManager?: boolean;
  requiresAdmin?: boolean;
  category?: string;
}

interface MenuCategory {
  title: string;
  items: MenuItem[];
  divider?: boolean;
}

const getMenuCategories = (isAdmin: boolean, hasGuild: boolean, isGuildLeaderOrManager: boolean): MenuCategory[] => {
  const categories: MenuCategory[] = [];

  const mainItems: MenuItem[] = [
    {
      title: '홈',
      path: '/',
      icon: <HomeIcon />,
      category: 'main',
    },
    {
      title: 'RTA 분석',
      path: '/rta',
      icon: <SportsEsportsIcon />,
      category: 'main',
    },
    {
      title: 'RTA 몬스터별 통계',
      path: '/rta/monster-stats',
      icon: <BarChartIcon />,
      category: 'main',
    },
  ];

  if (hasGuild) {
    mainItems.push(
      {
        title: '전체 점령전',
        path: '/siege',
        icon: <CastleIcon />,
        requiresGuild: true,
        category: 'main',
      },
      {
        title: '최근 점령전',
        path: '/recent-siege',
        icon: <HistoryIcon />,
        requiresGuild: true,
        category: 'main',
      },
      {
        title: '전적 조회',
        path: '/battle-history',
        icon: <BarChartIcon />,
        requiresGuild: true,
        category: 'main',
      }
    );
  }

  if (mainItems.length > 0) {
    categories.push({
      title: '메인',
      items: mainItems,
    });
  }

  const toolItems: MenuItem[] = [
    {
      title: '몬스터 검색',
      path: '/monster-search',
      icon: <SearchIcon />,
      category: 'tool',
    },
  ];

  if (isAdmin || isGuildLeaderOrManager) {
    toolItems.push({
      title: '로그 업로드',
      path: '/log-upload',
      icon: <UploadFileIcon />,
      requiresAdmin: isAdmin,
      category: 'tool',
    });
  }

  if (toolItems.length > 0) {
    categories.push({
      title: '도구',
      items: toolItems,
      divider: true,
    });
  }

  categories.push({
    title: '커뮤니티',
    items: [
      {
        title: '공지사항',
        path: '/notice',
        icon: <AnnouncementIcon />,
        category: 'community',
      },
      {
        title: '1대1 문의',
        path: '/inquiry',
        icon: <QuestionAnswerIcon />,
        category: 'community',
      },
    ],
    divider: true,
  });

  if (hasGuild && isGuildLeaderOrManager) {
    categories.push({
      title: '길드',
      items: [
        {
          title: '길드 관리',
          path: '/guild-management',
          icon: <GroupIcon />,
          requiresGuild: true,
          requiresLeaderOrManager: true,
          category: 'guild',
        },
      ],
      divider: true,
    });
  }

  categories.push({
    title: '설정',
    items: [
      {
        title: '설정',
        path: '/settings',
        icon: <SettingsIcon />,
        category: 'settings',
      },
    ],
  });

  return categories;
};

export default function FixedHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  
  const responsive = useResponsive();
  const isMobile = mounted ? responsive.isMobile : false;

  // 클라이언트 마운트 확인
  useEffect(() => {
    setMounted(true);
  }, []);

  // 사용자 정보 로드
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    
    const loadUserInfo = () => {
      if (isAuthenticated()) {
        const stored = localStorage.getItem('userInfo');
        if (stored) {
          try {
            setUserInfo(JSON.parse(stored));
          } catch (error) {
            console.error('사용자 정보 파싱 실패:', error);
          }
        }
      } else {
        setUserInfo(null);
      }
    };

    loadUserInfo();
    const interval = setInterval(loadUserInfo, 1000);
    return () => clearInterval(interval);
  }, [mounted]);

  // 길드 정보 조회
  const userGuildQuery = useUserGuild({
    enabled: mounted && isAuthenticated(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  // 길드 정보 동기화
  useEffect(() => {
    if (!mounted || !userGuildQuery.data) return;

    // userInfo가 없으면 먼저 localStorage에서 가져오기
    let currentUserInfo = userInfo;
    if (!currentUserInfo && typeof window !== 'undefined' && isAuthenticated()) {
      const stored = localStorage.getItem('userInfo');
      if (stored) {
        try {
          currentUserInfo = JSON.parse(stored);
        } catch (error) {
          console.error('사용자 정보 파싱 실패:', error);
          return;
        }
      }
    }

    if (!currentUserInfo) return;

    const updated = {
      ...currentUserInfo,
      guild_id: userGuildQuery.data.guild_id,
      guild_name: userGuildQuery.data.guild_name,
      guild_role: userGuildQuery.data.role,
    };

    if (JSON.stringify(currentUserInfo) !== JSON.stringify(updated)) {
      setUserInfo(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('userInfo', JSON.stringify(updated));
      }
    }
  }, [userGuildQuery.data, mounted, userInfo]);

  // 알림 목록 조회
  const notificationListQuery = useNotificationList({
    enabled: mounted && !!userInfo,
  });

  const markReadMutation = useMarkNotificationRead({
    onSuccess: () => {
      notificationListQuery.refetch();
    },
  });

  const markAllReadMutation = useMarkAllNotificationsRead({
    onSuccess: () => {
      notificationListQuery.refetch();
    },
  });

  const logoutMutation = useLogout({
    onSuccess: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('userInfo');
      }
      setUserInfo(null);
      handleUserMenuClose();
      router.push('/login');
    },
  });

  const isAdmin = useMemo(() => {
    return userInfo?.roles?.some((role: any) => role.role_id === 'RL0001') || false;
  }, [userInfo]);

  const hasGuild = useMemo(() => {
    if (!mounted || !isAuthenticated()) return false;
    // userInfo의 guild_id 또는 userGuildQuery.data의 guild_id 확인
    return !!(userInfo?.guild_id || userGuildQuery.data?.guild_id);
  }, [mounted, userInfo, userGuildQuery.data]);

  const isGuildLeaderOrManager = useMemo(() => {
    if (!mounted || !isAuthenticated()) return false;
    const role = userInfo?.guild_role || userGuildQuery.data?.role;
    return role === 'LEADER' || role === 'MANAGER';
  }, [mounted, userInfo, userGuildQuery.data]);

  const showNotification = useMemo(() => {
    return mounted && isAuthenticated() && !!userInfo;
  }, [mounted, userInfo]);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleNotificationItemClick = (notification: NotificationItem) => {
    if (!notification.is_read) {
      markReadMutation.mutate({ notification_id: notification.notification_id });
    }
    if (notification.related_url) {
      router.push(notification.related_url);
      handleNotificationClose();
    }
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate({});
  };

  const handleLogout = () => {
    logoutMutation.mutate({});
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    setDrawerOpen(false);
  };

  const handleHome = () => {
    router.push('/');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'GUILD_MEMBER_JOINED':
      case 'GUILD_MEMBER_LEFT':
      case 'GUILD_APPLICATION_PENDING':
        return <GroupIcon fontSize="small" />;
      case 'INQUIRY_PENDING':
      case 'INQUIRY_ANSWERED':
        return <QuestionAnswerIcon fontSize="small" />;
      case 'NOTICE_NEW':
        return <AnnouncementIcon fontSize="small" />;
      default:
        return <NotificationsIcon fontSize="small" />;
    }
  };

  const formatNotificationTime = (dateString: string) => {
    if (!mounted) return '';
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
      return '';
    }
  };

  const menuCategories = useMemo(() => {
    return getMenuCategories(isAdmin, hasGuild, isGuildLeaderOrManager);
  }, [isAdmin, hasGuild, isGuildLeaderOrManager]);

  // 서버와 클라이언트에서 동일한 초기 렌더링 보장
  const logoUrl = mounted ? getMonsterImageUrl('/images/ci_active.png') : '/images/ci_active.png';

  return (
    <>
      <AppBar
        position="fixed"
        component="div"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: '#2c3e50',
          boxShadow: 2,
        }}
      >
        <Toolbar
          component="div"
          sx={{
            px: { xs: 1, md: 2 },
            minHeight: { xs: 56, md: 64 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <IconButton
            color="inherit"
            aria-label="menu"
            edge="start"
            onClick={mounted ? handleDrawerToggle : undefined}
            disabled={!mounted}
            sx={{
              flexShrink: 0,
              marginLeft: 0,
              padding: '12px',
            }}
          >
            <MenuIcon />
          </IconButton>

          <Box
            onClick={mounted ? handleHome : undefined}
            sx={{
              flexGrow: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minWidth: 0,
              cursor: mounted ? 'pointer' : 'default',
            }}
          >
            <Box
              component="img"
              src={logoUrl}
              alt="로고"
              sx={{
                height: { xs: 32, md: 40 },
                width: 'auto',
                maxWidth: '100%',
                cursor: mounted ? 'pointer' : 'default',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 1 } }}>
            {showNotification && (
              <IconButton
                color="inherit"
                onClick={handleNotificationClick}
                sx={{ flexShrink: 0 }}
              >
                <Badge
                  badgeContent={notificationListQuery.data?.unreadCount || 0}
                  color="error"
                  max={99}
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '0.7rem',
                      minWidth: '18px',
                      height: '18px',
                      padding: '0 4px',
                    },
                  }}
                >
                  <NotificationsNoneIcon />
                </Badge>
              </IconButton>
            )}

            <IconButton
              color="inherit"
              onClick={mounted ? handleUserMenuClick : undefined}
              disabled={!mounted}
              sx={{ flexShrink: 0 }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                }}
              >
                <AccountCircleIcon />
              </Avatar>
            </IconButton>
          </Box>

          <Menu
            anchorEl={notificationAnchor}
            open={mounted && Boolean(notificationAnchor)}
            onClose={handleNotificationClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            PaperProps={{
              sx: {
                width: { xs: '90vw', sm: 380 },
                maxWidth: 380,
                maxHeight: '80vh',
                mt: 1,
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                알림
              </Typography>
              {notificationListQuery.data && notificationListQuery.data.unreadCount > 0 && (
                <Button
                  size="small"
                  onClick={handleMarkAllRead}
                  disabled={markAllReadMutation.isPending}
                  sx={{ fontSize: '0.75rem', minWidth: 'auto', px: 1 }}
                >
                  모두 읽음
                </Button>
              )}
            </Box>
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {notificationListQuery.isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    로딩 중...
                  </Typography>
                </Box>
              ) : notificationListQuery.data && notificationListQuery.data.list.length > 0 ? (
                <List sx={{ p: 0 }}>
                  {notificationListQuery.data.list.map((notification: NotificationItem) => (
                    <ListItem
                      key={notification.notification_id}
                      disablePadding
                      sx={{
                        bgcolor: notification.is_read ? 'transparent' : 'action.hover',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:hover': {
                          bgcolor: 'action.selected',
                        },
                      }}
                    >
                      <ListItemButton
                        onClick={() => handleNotificationItemClick(notification)}
                        sx={{ py: 1.5, px: 2 }}
                      >
                        <ListItemAvatar sx={{ minWidth: 40 }}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: notification.is_read ? 'action.disabledBackground' : 'primary.main',
                              color: notification.is_read ? 'action.disabled' : 'primary.contrastText',
                            }}
                          >
                            {getNotificationIcon(notification.type)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: notification.is_read ? 400 : 600,
                                  flex: 1,
                                }}
                              >
                                {notification.title}
                              </Typography>
                              {!notification.is_read && (
                                <CircleIcon sx={{ fontSize: 8, color: 'primary.main' }} />
                              )}
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
                                {formatNotificationTime(notification.crt_date)}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, px: 2 }}>
                  <NotificationsNoneIcon sx={{ fontSize: 48, color: 'action.disabled', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary" align="center">
                    알림이 없습니다
                  </Typography>
                </Box>
              )}
            </Box>
          </Menu>

          <Menu
            anchorEl={userMenuAnchor}
            open={mounted && Boolean(userMenuAnchor)}
            onClose={handleUserMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            {mounted && isAuthenticated() ? (
              [
                <Box key="user-info" sx={{ px: 2, py: 1, minWidth: 200 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {userInfo?.user_nm || userInfo?.user_id || '사용자'}
                  </Typography>
                  {userInfo?.guild_name && (
                    <Typography variant="caption" color="text.secondary">
                      {userInfo.guild_name}
                    </Typography>
                  )}
                </Box>,
                <Divider key="divider" />,
                isAdmin && (
                  <MenuItem key="admin" onClick={() => { handleNavigate('/admin'); handleUserMenuClose(); }}>
                    <ListItemIcon>
                      <AdminPanelSettingsIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>관리자 모드</ListItemText>
                  </MenuItem>
                ),
                <MenuItem key="settings" onClick={() => { handleNavigate('/settings'); handleUserMenuClose(); }}>
                  <ListItemIcon>
                    <AccountCircleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>마이페이지</ListItemText>
                </MenuItem>,
                <MenuItem key="logout" onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>로그아웃</ListItemText>
                </MenuItem>,
              ].filter(Boolean)
            ) : (
              <MenuItem onClick={() => { handleNavigate('/login'); handleUserMenuClose(); }}>
                <ListItemIcon>
                  <AccountCircleIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>로그인</ListItemText>
              </MenuItem>
            )}
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={mounted && drawerOpen}
        onClose={handleDrawerToggle}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar
          sx={{
            bgcolor: '#2c3e50',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 64,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            메뉴
          </Typography>
        </Toolbar>
        <Divider />
        <List>
          {menuCategories.map((category, categoryIndex) => {
            const filteredItems = category.items.filter((item) => {
              if (item.requiresGuild && !hasGuild) return false;
              if (item.requiresLeaderOrManager && !isGuildLeaderOrManager) return false;
              if (item.requiresAdmin && !isAdmin) return false;
              return true;
            });

            if (filteredItems.length === 0) return null;

            return (
              <Box key={category.title}>
                {categoryIndex > 0 && category.divider && <Divider sx={{ my: 1 }} />}
                {filteredItems.map((item) => (
                  <ListItem key={item.path} disablePadding>
                    <ListItemButton
                      selected={pathname === item.path}
                      onClick={() => handleNavigate(item.path)}
                      sx={{
                        '&.Mui-selected': {
                          bgcolor: 'action.selected',
                          '&:hover': {
                            bgcolor: 'action.selected',
                          },
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          color: pathname === item.path ? 'primary.main' : 'inherit',
                          minWidth: 40,
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.title}
                        primaryTypographyProps={{
                          fontSize: '0.9375rem',
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </Box>
            );
          })}
        </List>
      </Drawer>
    </>
  );
}
