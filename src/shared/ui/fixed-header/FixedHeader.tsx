'use client';

import Link from 'next/link';
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
  Button,
  Container,
  Link as MuiLink,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CastleIcon from '@mui/icons-material/Castle';
import MapIcon from '@mui/icons-material/Map';
import HistoryIcon from '@mui/icons-material/History';
import BarChartIcon from '@mui/icons-material/BarChart';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import GroupIcon from '@mui/icons-material/Group';
import AnnouncementIcon from '@mui/icons-material/Announcement';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PersonIcon from '@mui/icons-material/Person';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import GroupsIcon from '@mui/icons-material/Groups';
import HandymanIcon from '@mui/icons-material/Handyman';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import SpeedIcon from '@mui/icons-material/Speed';
import { useState, useEffect, useMemo, useCallback, useRef, useSyncExternalStore } from 'react';
import { useLogout } from '@/features/auth/hooks/useAuth';
import { useUserGuild } from '@/hooks/api';
import { clearClientAuth, isAuthenticated } from '@/shared/utils/auth';
import {
  useNotificationList,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDismissNotification,
} from '@/features/notification/hooks/useNotification';
import NotificationListPanel from '@/features/notification/components/NotificationListPanel';
import type { NotificationItem } from '@/features/notification/types/notification';
import { isNotificationUnread } from '@/features/notification/lib/notificationUtils';
import { showToast } from '@/shared/lib/notification';
import { getApiResultMessage, isApiSuccess } from '@/shared/lib/api/result';
import type { UserInfo } from '@/features/auth/types/auth';
import { logger } from '@/shared/lib/logger';
import { getPwaIconCacheQuery } from '@/shared/lib/pwa-icon-version';
import { SITE_NAME_DISPLAY } from '@/shared/lib/seo';
import RtaSummonerSearchDialog from '@/features/rta/components/RtaSummonerSearchDialog';
import { blurFocusedMenuItem, MUI_MENU_A11Y_PROPS } from '@/shared/ui/muiMenuA11y';

interface NavLeaf {
  title: string;
  path: string;
  icon: React.ReactNode;
  requiresGuild?: boolean;
  requiresLeaderOrManager?: boolean;
  requiresAdmin?: boolean;
  requiresLogin?: boolean;
  requiresNoGuild?: boolean;
  children?: NavLeaf[];
}

export interface NavGroup {
  id: 'rta' | 'siege' | 'community' | 'guide' | 'tools';
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
      {
        title: 'RTA 몬스터 통계', path: '/rta/monster-stats/solo', icon: <BarChartIcon />,
        children: [
          { title: '솔로', path: '/rta/monster-stats/solo', icon: <PersonIcon /> },
          { title: '듀오', path: '/rta/monster-stats/duo', icon: <Diversity3Icon /> },
          { title: '트리오', path: '/rta/monster-stats/trio', icon: <GroupsIcon /> },
        ],
      },
      { title: 'RTA 시뮬레이션 추천', path: '/rta/simulation-recommend', icon: <HandymanIcon /> },
      { title: 'RTA 소환사 랭킹', path: '/rta/summoner-ranking', icon: <EmojiEventsIcon /> },
      { title: 'RTA 랭크 컷', path: '/rta/rank-cutoffs', icon: <TrendingUpIcon /> },
    ],
  };

  const siegeItems: NavLeaf[] = [
      { title: '전체 점령전', path: '/siege', icon: <CastleIcon /> },
      { title: '공덱 조합 보기', path: '/siege/attack-decks', icon: <SportsEsportsIcon />, requiresGuild: true },
      { title: '최근 점령전', path: '/recent-siege', icon: <HistoryIcon />, requiresGuild: true },
      { title: '점령전 지도', path: '/siege/map', icon: <MapIcon />, requiresGuild: true },
      { title: '지도 히스토리', path: '/siege/map/history', icon: <HistoryIcon />, requiresGuild: true },
      { title: '전적 조회', path: '/battle-history', icon: <BarChartIcon />, requiresGuild: true },
      {
        title: '길드 관리',
        path: '/guild-management',
        icon: <GroupIcon />,
        requiresGuild: true,
        requiresLeaderOrManager: true,
      },
  ];
  if (isAdmin || isGuildLeaderOrManager) {
    siegeItems.push({
      title: '로그 업로드',
      path: '/log-upload',
      icon: <UploadFileIcon />,
      requiresAdmin: isAdmin,
      requiresGuild: !isAdmin && isGuildLeaderOrManager,
      requiresLeaderOrManager: !isAdmin && isGuildLeaderOrManager,
    });
  }

  const siege: NavGroup = {
    id: 'siege',
    label: 'Siege',
    hint: '점령전',
    dashboardPath: '/',
    items: siegeItems,
  };

  const community: NavGroup = {
    id: 'community',
    label: '커뮤니티',
    items: [
      { title: '공지사항', path: '/notice', icon: <AnnouncementIcon /> },
      { title: '길드원 모집', path: '/guild-recruitment', icon: <GroupIcon /> },
      { title: '1대1 문의', path: '/inquiry', icon: <QuestionAnswerIcon /> },
      {
        title: '길드 가입',
        path: '/guild-join',
        icon: <GroupIcon />,
        requiresLogin: true,
        requiresNoGuild: true,
      },
      {
        title: '길드 생성 신청',
        path: '/guild-application',
        icon: <GroupIcon />,
        requiresLogin: true,
        requiresNoGuild: true,
      },
    ],
  };

  const guideItemsFinal: NavLeaf[] = [
    { title: '서비스 소개', path: '/about', icon: <MenuBookIcon /> },
    { title: '몬스터 검색', path: '/monster-search', icon: <SearchIcon /> },
  ];

  const guideGroup: NavGroup = { id: 'guide', label: '가이드', items: guideItemsFinal };

  const toolsGroup: NavGroup = {
    id: 'tools',
    label: '도구',
    items: [
      { title: '티어 리스트 메이커', path: '/tier-list', icon: <FormatListNumberedIcon /> },
      { title: '공속 순서 계산기', path: '/speed-calculator', icon: <SpeedIcon /> },
    ],
  };

  const groups: NavGroup[] = [rta, siege, community, guideGroup, toolsGroup];

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
  if (itemPath === '/siege/map') {
    return (
      pathname === '/siege/map' ||
      (pathname.startsWith('/siege/map/') && !pathname.startsWith('/siege/map/history'))
    );
  }
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
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
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

  // 알림 목록 조회 (로그인 상태일 때 자동 조회 — 배지 카운트 표시용)
  const notificationListQuery = useNotificationList({
    enabled: isClient && isAuthenticated() && !!storedUserInfo,
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
      } else {
        showToast.error(getApiResultMessage(res, '전체 읽음 처리에 실패했습니다.'));
      }
      notificationListQuery.refetch();
    },
    onError: () => {
      showToast.error('전체 읽음 처리에 실패했습니다.');
    },
  });

  const dismissNotificationMutation = useDismissNotification({
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
    blurFocusedMenuItem();
    setUserMenuAnchor(null);
  };

  const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
    // 메뉴를 열 때만 최신 알림 조회
    notificationListQuery.refetch();
  };

  const handleNotificationClose = () => {
    blurFocusedMenuItem();
    setNotificationAnchor(null);
  };

  const handleNotificationItemClick = (notification: NotificationItem) => {
    if (isNotificationUnread(notification)) {
      markReadMutation.mutate({ notification_id: notification.notification_id });
    }
    if (notification.related_url) {
      router.push(notification.related_url);
      handleNotificationClose();
    }
  };

  const handleDismissNotification = (notificationId: string) => {
    dismissNotificationMutation.mutate({ notification_id: notificationId });
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate({});
  };

  const handleViewAllNotifications = () => {
    handleNotificationClose();
    router.push('/notifications');
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

  const isLoggedIn = isClient && isAuthenticated();

  const navGroups = useMemo(
    () => getNavGroups(isAdmin, hasGuild, isGuildLeaderOrManager, isLoggedIn),
    [isAdmin, hasGuild, isGuildLeaderOrManager, isLoggedIn],
  );

  /** 데스크톱: 대분류 호버 시 하위 메뉴 앵커 */
  const [navHover, setNavHover] = useState<{ groupId: NavGroup['id']; anchor: HTMLElement } | null>(null);
  const navHoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeNavHoverMenu = useCallback(() => {
    if (navHoverCloseTimerRef.current) {
      clearTimeout(navHoverCloseTimerRef.current);
      navHoverCloseTimerRef.current = null;
    }
    blurFocusedMenuItem();
    setNavHover(null);
  }, []);

  const cancelNavHoverClose = useCallback(() => {
    if (navHoverCloseTimerRef.current) {
      clearTimeout(navHoverCloseTimerRef.current);
      navHoverCloseTimerRef.current = null;
    }
  }, []);

  const scheduleNavHoverClose = useCallback(() => {
    cancelNavHoverClose();
    navHoverCloseTimerRef.current = setTimeout(() => {
      navHoverCloseTimerRef.current = null;
      blurFocusedMenuItem();
      setNavHover(null);
    }, 100);
  }, [cancelNavHoverClose]);

  /** 데스크톱 대메뉴 버튼·Portal Menu 안에 포커스가 있는지 (키보드 blur 후에도 열림 방지) */
  const isFocusInDesktopNavFlyout = useCallback((): boolean => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return false;
    if (active.closest('[role="menu"]')) return true;
    for (const group of navGroups) {
      const btn = document.getElementById(`nav-group-${group.id}`);
      if (btn && (btn === active || btn.contains(active))) return true;
    }
    return false;
  }, [navGroups]);

  useEffect(() => {
    closeNavHoverMenu();
  }, [pathname, closeNavHoverMenu]);

  /** Menu는 Portal — 포커스가 빠지면 닫기 (pointermove만으로는 키보드 탭 이탈 시 메뉴가 남음) */
  useEffect(() => {
    if (!isClient || !navHover) return;

    const onFocusOut = () => {
      queueMicrotask(() => {
        if (!isFocusInDesktopNavFlyout()) {
          closeNavHoverMenu();
        }
      });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeNavHoverMenu();
      }
    };

    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isClient, navHover, isFocusInDesktopNavFlyout, closeNavHoverMenu]);

  /** 대메뉴 버튼 또는 Portal 하위 Menu 위인지 (좌표 기준 — Paper가 옆 버튼을 가릴 때도 전환 가능) */
  const resolveNavHoverAtPoint = useCallback(
    (clientX: number, clientY: number): { groupId: NavGroup['id']; anchor: HTMLElement } | 'menu' | null => {
      for (const group of navGroups) {
        const btn = document.getElementById(`nav-group-${group.id}`);
        if (!(btn instanceof HTMLElement)) continue;
        const r = btn.getBoundingClientRect();
        if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
          return { groupId: group.id, anchor: btn };
        }
      }
      const el = document.elementFromPoint(clientX, clientY);
      if (el?.closest('[role="menu"]')) {
        return 'menu';
      }
      return null;
    },
    [navGroups],
  );

  const handleNavGroupMouseEnter = useCallback(
    (groupId: NavGroup['id'], anchor: HTMLElement) => {
      if (!isClient) return;
      cancelNavHoverClose();
      setNavHover({ groupId, anchor });
    },
    [isClient, cancelNavHoverClose],
  );

  /** Menu는 Portal이라 nav mouseLeave만으로는 닫히지 않음 — 열린 동안 document에서 hover 영역 추적 */
  useEffect(() => {
    if (!isClient || !navHover) return;

    const onPointerMove = (e: PointerEvent) => {
      const hit = resolveNavHoverAtPoint(e.clientX, e.clientY);
      if (hit === 'menu') {
        cancelNavHoverClose();
        return;
      }
      if (hit) {
        cancelNavHoverClose();
        setNavHover((prev) => {
          if (prev?.groupId === hit.groupId && prev.anchor === hit.anchor) return prev;
          return hit;
        });
        return;
      }
      scheduleNavHoverClose();
    };

    document.addEventListener('pointermove', onPointerMove);
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      cancelNavHoverClose();
    };
  }, [isClient, navHover, resolveNavHoverAtPoint, cancelNavHoverClose, scheduleNavHoverClose]);

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
                      aria-expanded={menuOpen}
                      aria-haspopup="menu"
                      endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 18, opacity: 0.85 }} />}
                      onMouseEnter={(e) => handleNavGroupMouseEnter(group.id, e.currentTarget)}
                      onBlur={() => {
                        queueMicrotask(() => {
                          if (!isFocusInDesktopNavFlyout()) {
                            scheduleNavHoverClose();
                          }
                        });
                      }}
                      onClick={() => {
                        if (!isClient) return;
                        if (group.dashboardPath) {
                          handleNavigate(group.dashboardPath);
                          closeNavHoverMenu();
                          return;
                        }
                        const btn = document.getElementById(`nav-group-${group.id}`);
                        if (!(btn instanceof HTMLElement)) return;
                        if (navHover?.groupId === group.id) {
                          closeNavHoverMenu();
                          return;
                        }
                        cancelNavHoverClose();
                        setNavHover({ groupId: group.id, anchor: btn });
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
                      disableAutoFocus
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                      {...MUI_MENU_A11Y_PROPS}
                      slotProps={{
                        ...MUI_MENU_A11Y_PROPS.slotProps,
                        paper: {
                          onMouseEnter: cancelNavHoverClose,
                          onMouseLeave: scheduleNavHoverClose,
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
                        if (item.children) {
                          return (
                            <Box key={item.path}>
                              <Typography variant="caption" sx={{ px: 2, pt: 1, pb: 0.5, display: 'block', color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                {item.title}
                              </Typography>
                              {item.children.map((child) => {
                                const childActive = isNavLeafActive(child.path, pathname);
                                return (
                                  <MenuItem
                                    key={child.path}
                                    component={Link}
                                    href={child.path}
                                    onClick={closeNavHoverMenu}
                                    sx={{ py: 1, pl: 3, gap: 1.5, color: childActive ? 'primary.light' : 'rgba(255,255,255,0.9)', bgcolor: childActive ? 'rgba(255,255,255,0.06)' : 'transparent', textDecoration: 'none' }}
                                  >
                                    <Box sx={{ display: 'flex', color: 'text.secondary', '& svg': { fontSize: 18 } }}>{child.icon}</Box>
                                    <Typography variant="body2" sx={{ fontWeight: childActive ? 600 : 400 }}>{child.title}</Typography>
                                  </MenuItem>
                                );
                              })}
                            </Box>
                          );
                        }
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

            <Box
              onClick={() => setSearchDialogOpen(true)}
              role="button"
              aria-label="소환사 검색"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.5,
                py: 0.5,
                minWidth: { xs: 120, sm: 200 },
                maxWidth: 280,
                flexShrink: 1,
                bgcolor: 'rgba(255,255,255,0.12)',
                borderRadius: 2,
                cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.18)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
              }}
            >
              <SearchIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
              <Typography
                variant="body2"
                noWrap
                sx={{ color: 'rgba(255,255,255,0.5)', flex: 1, minWidth: 0, userSelect: 'none' }}
              >
                소환사 검색
              </Typography>
            </Box>
            <RtaSummonerSearchDialog
              open={searchDialogOpen}
              onClose={() => setSearchDialogOpen(false)}
            />

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
            {...MUI_MENU_A11Y_PROPS}
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
            <NotificationListPanel
              notifications={notificationListQuery.data?.list ?? []}
              unreadCount={notificationListQuery.data?.unreadCount ?? 0}
              isLoading={notificationListQuery.isLoading}
              isClient={isClient}
              maxHeight={400}
              onItemClick={handleNotificationItemClick}
              onDismiss={handleDismissNotification}
              onMarkAllRead={handleMarkAllRead}
              markAllReadPending={markAllReadMutation.isPending}
              dismissingId={
                dismissNotificationMutation.isPending
                  ? dismissNotificationMutation.variables?.notification_id ?? null
                  : null
              }
            />
            <Box sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'center' }}>
              <Button size="small" fullWidth onClick={handleViewAllNotifications}>
                알림 관리
              </Button>
            </Box>
          </Menu>

          <Menu
            anchorEl={userMenuAnchor}
            open={isClient && Boolean(userMenuAnchor)}
            onClose={handleUserMenuClose}
            {...MUI_MENU_A11Y_PROPS}
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
                if (item.children) {
                  return (
                    <Box key={`${group.id}-${item.path}-group`}>
                      <Typography variant="caption" sx={{ px: 2, pt: 0.5, pb: 0.25, display: 'block', color: 'text.disabled', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {item.title}
                      </Typography>
                      {item.children.map((child) => {
                        const childActive = isNavLeafActive(child.path, pathname);
                        return (
                          <ListItem key={`${group.id}-${child.path}`} disablePadding sx={{ px: 1, mb: 0.25 }}>
                            <ListItemButton
                              component={Link}
                              href={child.path}
                              selected={childActive}
                              onClick={() => setDrawerOpen(false)}
                              sx={{ borderRadius: 2, py: 0.75, pl: 3, '&.Mui-selected': { bgcolor: 'action.selected', '&:hover': { bgcolor: 'action.selected' } }, '&:hover': { bgcolor: 'action.hover' } }}
                            >
                              <ListItemIcon sx={{ color: childActive ? 'primary.main' : 'text.secondary', minWidth: 36 }}>{child.icon}</ListItemIcon>
                              <ListItemText primary={child.title} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: childActive ? 600 : 400 }} />
                            </ListItemButton>
                          </ListItem>
                        );
                      })}
                    </Box>
                  );
                }
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
                      <ListItemIcon sx={{ color: itemActive ? 'primary.main' : 'text.secondary', minWidth: 40 }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.title}
                        primaryTypographyProps={{ fontSize: '0.9375rem', fontWeight: itemActive ? 600 : 400 }}
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
