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
  ListSubheader,
  Avatar,
  Divider,
  Badge,
  ListItemAvatar,
  Button,
  Container,
  Link as MuiLink,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import CastleIcon from '@mui/icons-material/Castle';
import HistoryIcon from '@mui/icons-material/History';
import BarChartIcon from '@mui/icons-material/BarChart';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
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
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from 'react';
import { useLogout } from '@/features/auth/hooks/useAuth';
import { useUserGuild } from '@/hooks/api';
import { clearClientAuth, isAuthenticated } from '@/shared/utils/auth';
import { MS_PER_MINUTE, MS_PER_HOUR, MS_PER_DAY } from '@/shared/constants/validation';
import {
  useNotificationList,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/features/notification/hooks/useNotification';
import type { NotificationItem } from '@/features/notification/types/notification';
import type { UserInfo } from '@/features/auth/types/auth';
import { logger } from '@/shared/lib/logger';
import { getPwaIconCacheQuery } from '@/shared/lib/pwa-icon-version';
import { SITE_NAME_DISPLAY } from '@/shared/lib/seo';
import RtaSummonerSearchHeader from '@/features/rta/components/RtaSummonerSearchHeader';

interface NavLeaf {
  title: string;
  path: string;
  icon: React.ReactNode;
  requiresGuild?: boolean;
  requiresLeaderOrManager?: boolean;
  requiresAdmin?: boolean;
  requiresLogin?: boolean;
  /** 길드 없을 때만 노출 (예: 길드 가입 신청) */
  requiresNoGuild?: boolean;
}

export interface NavGroup {
  id: 'rta' | 'siege' | 'community' | 'guide';
  /** 대분류 라벨 (예: RTA, Siege) */
  label: string;
  /** 괄호 안 부제 (예: 실레나, 점령전) */
  hint?: string;
  items: NavLeaf[];
  /** 데스크톱 대메뉴(대분류) 클릭 시 이동할 경로 (메인 포털로 통일 시 `/`) */
  dashboardPath?: string;
}

function isNavLeafVisible(item: NavLeaf, ctx: { hasGuild: boolean; isGuildLeaderOrManager: boolean; isAdmin: boolean; isLoggedIn: boolean }): boolean {
  if (item.requiresLogin && !ctx.isLoggedIn) return false;
  if (item.requiresNoGuild && ctx.hasGuild) return false;
  if (item.requiresGuild && !ctx.hasGuild) return false;
  if (item.requiresLeaderOrManager && !ctx.isGuildLeaderOrManager) return false;
  if (item.requiresAdmin && !ctx.isAdmin) return false;
  return true;
}

function getNavGroups(
  isAdmin: boolean,
  hasGuild: boolean,
  isGuildLeaderOrManager: boolean,
  isLoggedIn: boolean,
): NavGroup[] {
  const ctx = { hasGuild, isGuildLeaderOrManager, isAdmin, isLoggedIn };

  const rta: NavGroup = {
    id: 'rta',
    label: 'RTA',
    hint: '실레나',
    dashboardPath: '/',
    items: [
      { title: 'RTA 분석', path: '/rta', icon: <SportsEsportsIcon /> },
      { title: 'RTA 몬스터 통계', path: '/rta/monster-stats', icon: <BarChartIcon /> },
      { title: 'RTA 소환사 랭킹', path: '/rta/summoner-ranking', icon: <EmojiEventsIcon /> },
      { title: 'RTA 랭크 컷', path: '/rta/rank-cutoffs', icon: <TrendingUpIcon /> },
    ],
  };

  const siege: NavGroup = {
    id: 'siege',
    label: 'Siege',
    hint: '점령전',
    dashboardPath: '/',
    items: [
      { title: '전체 점령전', path: '/siege', icon: <CastleIcon /> },
      { title: '최근 점령전', path: '/recent-siege', icon: <HistoryIcon />, requiresGuild: true },
      { title: '전적 조회', path: '/battle-history', icon: <BarChartIcon />, requiresGuild: true },
    ],
  };

  const community: NavGroup = {
    id: 'community',
    label: '커뮤니티',
    items: [
      { title: '공지사항', path: '/notice', icon: <AnnouncementIcon /> },
      { title: '길드원 모집', path: '/guild-recruitment', icon: <GroupIcon /> },
      { title: '1대1 문의', path: '/inquiry', icon: <QuestionAnswerIcon /> },
      {
        title: '길드 가입 신청',
        path: '/guild-application',
        icon: <GroupIcon />,
        requiresLogin: true,
        requiresNoGuild: true,
      },
      {
        title: '길드 관리',
        path: '/guild-management',
        icon: <GroupIcon />,
        requiresGuild: true,
        requiresLeaderOrManager: true,
      },
    ],
  };

  const guideItemsFinal: NavLeaf[] = [
    { title: '홈', path: '/', icon: <HomeIcon /> },
    { title: '서비스 소개', path: '/about', icon: <MenuBookIcon /> },
    { title: '몬스터 검색', path: '/monster-search', icon: <SearchIcon /> },
  ];
  if (isLoggedIn) {
    guideItemsFinal.push({ title: '계정 요약', path: '/account-summary', icon: <AccountCircleIcon />, requiresLogin: true });
  }
  if (isAdmin || isGuildLeaderOrManager) {
    guideItemsFinal.push({
      title: '로그 업로드',
      path: '/log-upload',
      icon: <UploadFileIcon />,
      requiresAdmin: isAdmin,
      requiresGuild: !isAdmin && isGuildLeaderOrManager,
      requiresLeaderOrManager: !isAdmin && isGuildLeaderOrManager,
    });
  }
  if (isLoggedIn) {
    guideItemsFinal.push({ title: '설정', path: '/settings', icon: <SettingsIcon />, requiresLogin: true });
  }

  const guideGroup: NavGroup = { id: 'guide', label: '가이드', items: guideItemsFinal };

  const groups: NavGroup[] = [rta, siege, community, guideGroup];

  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => isNavLeafVisible(item, ctx)),
    }))
    .filter((g) => g.items.length > 0);
}

/**
 * 메뉴 항목 활성 여부.
 * `/rta`, `/siege` 처럼 하위에 전용 페이지가 있는 루트는
 * `startsWith('/rta/')` 를 쓰면 모든 RTA 화면에서 해당 항목이 항상 액티브가 되므로 **경로 일치만** 본다.
 */
function isNavLeafActive(itemPath: string, pathname: string): boolean {
  if (itemPath === '/') return pathname === '/';
  if (pathname === itemPath) return true;
  if (itemPath === '/rta' || itemPath === '/siege') return false;
  return pathname.startsWith(`${itemPath}/`);
}

function isNavGroupActive(group: NavGroup, pathname: string): boolean {
  return group.items.some((item) => isNavLeafActive(item.path, pathname));
}

function navGroupTitle(group: NavGroup): string {
  return group.hint ? `${group.label} (${group.hint})` : group.label;
}

export default function FixedHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const userInfoSnapshot = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') {
        return () => {};
      }

      const handleChange = () => onStoreChange();
      window.addEventListener('smwr:auth-changed', handleChange);
      window.addEventListener('storage', handleChange);
      return () => {
        window.removeEventListener('smwr:auth-changed', handleChange);
        window.removeEventListener('storage', handleChange);
      };
    },
    () => {
      if (typeof window === 'undefined' || !isAuthenticated()) {
        return null;
      }
      return localStorage.getItem('userInfo');
    },
    () => null,
  );
  const storedUserInfo = useMemo<UserInfo | null>(() => {
    if (!userInfoSnapshot) {
      return null;
    }

    try {
      return JSON.parse(userInfoSnapshot) as UserInfo;
    } catch (error) {
      logger.error('사용자 정보 파싱 실패', error);
      return null;
    }
  }, [userInfoSnapshot]);

  // 길드 정보 조회
  const userGuildQuery = useUserGuild({
    enabled: isClient && isAuthenticated(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const userInfo = useMemo<UserInfo | null>(() => {
    if (!storedUserInfo) {
      return null;
    }

    if (!userGuildQuery.data) {
      return storedUserInfo;
    }

    return {
      ...storedUserInfo,
      guild_id: userGuildQuery.data.guild_id,
      guild_name: userGuildQuery.data.guild_name,
      guild_role:
        userGuildQuery.data.role === 'LEADER' ||
        userGuildQuery.data.role === 'MANAGER' ||
        userGuildQuery.data.role === 'MEMBER'
          ? userGuildQuery.data.role
          : storedUserInfo.guild_role,
    };
  }, [storedUserInfo, userGuildQuery.data]);

  useEffect(() => {
    if (!isClient || !userInfo || !userGuildQuery.data) {
      return;
    }

    const nextValue = JSON.stringify(userInfo);
    if (localStorage.getItem('userInfo') !== nextValue) {
      localStorage.setItem('userInfo', nextValue);
    }
  }, [isClient, userGuildQuery.data, userInfo]);

  // 알림 목록 조회
  const notificationListQuery = useNotificationList({
    // 초기 화면 진입 때 매번 가져오지 않음 (메뉴 열 때만 조회)
    enabled: false,
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
        clearClientAuth();
      }
      handleUserMenuClose();
      // 로그아웃 시 로그인 페이지로 강제 이동하지 않음
      router.push('/');
    },
  });

  const isAdmin = useMemo(() => {
    return userInfo?.roles?.some((role) => role.role_id === 'RL0001') || false;
  }, [userInfo]);

  const hasGuild = useMemo(() => {
    if (!isClient || !isAuthenticated()) return false;
    // userInfo의 guild_id 또는 userGuildQuery.data의 guild_id 확인
    return !!(userInfo?.guild_id || userGuildQuery.data?.guild_id);
  }, [isClient, userInfo, userGuildQuery.data]);

  const isGuildLeaderOrManager = useMemo(() => {
    if (!isClient || !isAuthenticated()) return false;
    const role = userInfo?.guild_role || userGuildQuery.data?.role;
    return role === 'LEADER' || role === 'MANAGER';
  }, [isClient, userInfo, userGuildQuery.data]);

  const showNotification = useMemo(() => {
    return isClient && isAuthenticated() && !!userInfo;
  }, [isClient, userInfo]);

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
    // 메뉴를 열 때만 최신 알림 조회
    notificationListQuery.refetch();
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
    if (!isClient) return '';
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

  const isLoggedIn = isClient && isAuthenticated();

  const navGroups = useMemo(
    () => getNavGroups(isAdmin, hasGuild, isGuildLeaderOrManager, isLoggedIn),
    [isAdmin, hasGuild, isGuildLeaderOrManager, isLoggedIn],
  );

  /** 데스크톱: 대분류 호버 시 하위 메뉴 앵커 */
  const [navHover, setNavHover] = useState<{ groupId: NavGroup['id']; anchor: HTMLElement } | null>(null);

  const closeNavHoverMenu = () => {
    setNavHover(null);
  };

  /**
   * 열린 하위 메뉴(MUI Paper)가 옆 대메뉴 버튼 위까지 가로로 넓어져,
   * 옆 그룹 onMouseEnter가 막히는 문제를 피하려고 버튼 rect만 좌표로 판별한다.
   */
  const handleNavMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isClient) return;
      const { clientX, clientY } = e;
      for (const group of navGroups) {
        const btn = document.getElementById(`nav-group-${group.id}`);
        if (!(btn instanceof HTMLElement)) continue;
        const r = btn.getBoundingClientRect();
        if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
          setNavHover((prev) => {
            const next = { groupId: group.id, anchor: btn };
            if (prev?.groupId === next.groupId && prev?.anchor === next.anchor) return prev;
            return next;
          });
          return;
        }
      }
      const el = document.elementFromPoint(clientX, clientY);
      if (el?.closest('[role="menu"]')) {
        return;
      }
    },
    [isClient, navGroups],
  );

  const iconQ = getPwaIconCacheQuery();
  const logoIconUrl = `/icons/ci_active.png${iconQ}`;
  const wordmarkBase = SITE_NAME_DISPLAY.includes('.')
    ? SITE_NAME_DISPLAY.slice(0, SITE_NAME_DISPLAY.lastIndexOf('.'))
    : SITE_NAME_DISPLAY;
  const wordmarkSuffix = SITE_NAME_DISPLAY.includes('.')
    ? SITE_NAME_DISPLAY.slice(SITE_NAME_DISPLAY.lastIndexOf('.'))
    : '';

  return (
    <>
      <AppBar
        position="fixed"
        component="div"
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          bgcolor: '#2c3e50',
          boxShadow: 2,
        }}
      >
        <Container maxWidth="xl" disableGutters sx={{ px: { xs: 1.5, sm: 2 } }}>
          <Toolbar
            component="div"
            disableGutters
            sx={{
              minHeight: 56,
              maxHeight: 56,
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1, sm: 1.5 },
            }}
          >
            <IconButton
              color="inherit"
              aria-label="메뉴 열기"
              edge="start"
              onClick={isClient ? handleDrawerToggle : undefined}
              disabled={!isClient}
              sx={{
                display: { xs: 'inline-flex', lg: 'none' },
                flexShrink: 0,
                ml: -0.5,
              }}
            >
              <MenuIcon />
            </IconButton>

            <MuiLink
              component="button"
              type="button"
              onClick={isClient ? handleHome : undefined}
              underline="none"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                mr: { xs: 1, sm: 1.5 },
                minWidth: 0,
                flexShrink: 0,
                cursor: isClient ? 'pointer' : 'default',
                color: 'inherit',
                textAlign: 'left',
                border: 'none',
                background: 'none',
                p: 0,
                font: 'inherit',
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  width: 32,
                  height: 32,
                  borderRadius: 2,
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.12)',
                  bgcolor: 'rgba(255,255,255,0.06)',
                }}
              >
                <Box
                  component="img"
                  src={logoIconUrl}
                  alt=""
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </Box>
              <Typography
                component="span"
                sx={{
                  fontWeight: 600,
                  fontSize: '1.125rem',
                  letterSpacing: '-0.02em',
                  display: { xs: 'none', sm: 'inline' },
                  whiteSpace: 'nowrap',
                }}
              >
                {wordmarkBase}
                <Box component="span" sx={{ color: 'primary.main' }}>
                  {wordmarkSuffix}
                </Box>
              </Typography>
            </MuiLink>

            <Divider
              orientation="vertical"
              flexItem
              sx={{
                display: { xs: 'none', lg: 'block' },
                borderColor: 'rgba(255,255,255,0.12)',
                height: 24,
                alignSelf: 'center',
                mr: 1,
              }}
            />

            <Box
              component="nav"
              aria-label="주요 메뉴"
              onMouseMove={handleNavMouseMove}
              onMouseLeave={(e) => {
                if (!isClient) return;
                // 대메뉴 간 이동 시에는 닫지 않음(자식 → 자식은 relatedTarget이 아직 nav 안).
                // nav 영역 밖으로 나갈 때만 하위 메뉴 닫기.
                const next = e.relatedTarget;
                if (next instanceof Node && e.currentTarget.contains(next)) return;
                closeNavHoverMenu();
              }}
              sx={{
                display: { xs: 'none', lg: 'flex' },
                flex: 1,
                alignItems: 'center',
                gap: 0.5,
                minWidth: 0,
                overflow: 'hidden',
              }}
            >
              {navGroups.map((group) => {
                const active = isNavGroupActive(group, pathname);
                const menuOpen = isClient && navHover?.groupId === group.id && Boolean(navHover?.anchor);
                return (
                  <Box
                    key={group.id}
                    sx={{
                      display: 'inline-flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      position: 'relative',
                    }}
                  >
                    <Button
                      id={`nav-group-${group.id}`}
                      color="inherit"
                      size="small"
                      endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 18, opacity: 0.85 }} />}
                      onClick={() => {
                        if (!isClient) return;
                        if (group.dashboardPath) {
                          handleNavigate(group.dashboardPath);
                          closeNavHoverMenu();
                          return;
                        }
                        const btn = document.getElementById(`nav-group-${group.id}`);
                        if (btn instanceof HTMLElement) {
                          setNavHover({ groupId: group.id, anchor: btn });
                        }
                      }}
                      sx={{
                        px: 1.25,
                        py: 0.5,
                        minWidth: 0,
                        borderRadius: 2,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        color: active ? 'primary.light' : 'rgba(255,255,255,0.85)',
                        bgcolor: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                        // 하위 메뉴 Paper(보통 zIndex.modal)보다 위에 두어 옆 대메뉴 클릭이 가로채이지 않게 함
                        position: 'relative',
                        zIndex: (theme) => theme.zIndex.modal + 1,
                        '&:hover': {
                          bgcolor: 'rgba(255,255,255,0.08)',
                        },
                      }}
                    >
                      {navGroupTitle(group)}
                    </Button>
                    <Menu
                      anchorEl={menuOpen ? navHover?.anchor ?? null : null}
                      open={menuOpen}
                      onClose={closeNavHoverMenu}
                      disableScrollLock
                      disableAutoFocus
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                      slotProps={{
                        paper: {
                          sx: {
                            mt: 0.5,
                            zIndex: (theme) => theme.zIndex.modal,
                            minWidth: 240,
                            maxWidth: 320,
                            borderRadius: 2,
                            border: '1px solid rgba(255,255,255,0.08)',
                            bgcolor: 'rgba(30, 41, 59, 0.98)',
                            backdropFilter: 'blur(12px)',
                          },
                        },
                      }}
                    >
                      {group.items.map((item) => {
                        const subActive = isNavLeafActive(item.path, pathname);
                        return (
                          <MenuItem
                            key={item.path}
                            onClick={() => {
                              if (isClient) {
                                handleNavigate(item.path);
                                closeNavHoverMenu();
                              }
                            }}
                            sx={{
                              py: 1.25,
                              gap: 1.5,
                              color: subActive ? 'primary.light' : 'rgba(255,255,255,0.9)',
                              bgcolor: subActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                            }}
                          >
                            <Box sx={{ display: 'flex', color: 'text.secondary', '& svg': { fontSize: 20 } }}>
                              {item.icon}
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: subActive ? 600 : 400 }}>
                              {item.title}
                            </Typography>
                          </MenuItem>
                        );
                      })}
                    </Menu>
                  </Box>
                );
              })}
            </Box>

            <Box sx={{ flexGrow: { xs: 1, lg: 0 } }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 1 }, flexShrink: 0 }}>
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

            <Box sx={{ minWidth: 0, flexShrink: 1 }}>
              <RtaSummonerSearchHeader />
            </Box>

            <IconButton
              color="inherit"
              onClick={isClient ? handleUserMenuClick : undefined}
              disabled={!isClient}
              sx={{ flexShrink: 0 }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: isClient && isAuthenticated() && userInfo
                    ? 'primary.main'
                    : 'rgba(255, 255, 255, 0.2)',
                  color: isClient && isAuthenticated() && userInfo
                    ? 'white'
                    : 'rgba(255, 255, 255, 0.6)',
                  transition: 'all 0.2s ease',
                }}
              >
                <AccountCircleIcon />
              </Avatar>
            </IconButton>
          </Box>

          <Menu
            anchorEl={notificationAnchor}
            open={isClient && Boolean(notificationAnchor)}
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
            open={isClient && Boolean(userMenuAnchor)}
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
            {isClient && isAuthenticated() && !!userInfo ? (
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
                <MenuItem key="account-summary" onClick={() => { handleNavigate('/account-summary'); handleUserMenuClose(); }}>
                  <ListItemIcon>
                    <AccountCircleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>계정 요약</ListItemText>
                </MenuItem>,
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
        </Container>
      </AppBar>

      <Drawer
        anchor="left"
        open={isClient && drawerOpen}
        onClose={handleDrawerToggle}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.75,
            bgcolor: '#2c3e50',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 0 0 1px rgba(255,255,255,0.12)',
              bgcolor: 'rgba(255,255,255,0.06)',
            }}
          >
            <Box
              component="img"
              src={logoIconUrl}
              alt=""
              sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {wordmarkBase}
              <Box component="span" sx={{ color: 'primary.light' }}>
                {wordmarkSuffix}
              </Box>
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.75, display: 'block' }}>
              메뉴
            </Typography>
          </Box>
        </Box>
        <List dense disablePadding sx={{ py: 1 }}>
          {navGroups.map((group, groupIndex) => (
            <Box key={group.id}>
              {groupIndex > 0 && <Divider sx={{ my: 1.5, mx: 2 }} />}
              <ListSubheader
                disableSticky
                sx={{
                  bgcolor: 'background.paper',
                  lineHeight: 1.3,
                  py: 1.25,
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: 'text.primary',
                }}
              >
                {group.dashboardPath ? (
                  <Box
                    component="button"
                    type="button"
                    onClick={() => handleNavigate(group.dashboardPath!)}
                    sx={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      p: 0,
                      m: 0,
                      font: 'inherit',
                      fontWeight: 700,
                      fontSize: 'inherit',
                      color: 'primary.main',
                      textAlign: 'left',
                      width: '100%',
                      display: 'block',
                    }}
                  >
                    {navGroupTitle(group)}
                  </Box>
                ) : (
                  navGroupTitle(group)
                )}
              </ListSubheader>
              {group.items.map((item) => {
                const itemActive = isNavLeafActive(item.path, pathname);
                return (
                  <ListItem key={`${group.id}-${item.path}`} disablePadding sx={{ px: 1, mb: 0.25 }}>
                    <ListItemButton
                      selected={itemActive}
                      onClick={() => handleNavigate(item.path)}
                      sx={{
                        borderRadius: 2,
                        py: 1,
                        '&.Mui-selected': {
                          bgcolor: 'action.selected',
                          '&:hover': { bgcolor: 'action.selected' },
                        },
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          color: itemActive ? 'primary.main' : 'text.secondary',
                          minWidth: 40,
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.title}
                        primaryTypographyProps={{
                          fontSize: '0.9375rem',
                          fontWeight: itemActive ? 600 : 400,
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </Box>
          ))}
        </List>
      </Drawer>
    </>
  );
}
