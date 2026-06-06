'use client';

import { useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  alpha,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
  Skeleton,
  Chip,
  Tabs,
  Tab,
  List,
  ListItemButton,
  ListItemText,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import type { ChipProps } from '@mui/material/Chip';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SecurityIcon from '@mui/icons-material/Security';
import InfoIcon from '@mui/icons-material/Info';
import LogoutIcon from '@mui/icons-material/Logout';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import GroupIcon from '@mui/icons-material/Group';
import SearchIcon from '@mui/icons-material/Search';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SummarizeIcon from '@mui/icons-material/Summarize';
import HistoryIcon from '@mui/icons-material/History';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/ui';
import { showToast } from '@/shared/lib/notification';
import {
  useUserGuild,
  useGuildSearch,
  useApplyGuildJoinApplication,
  useMyGuildJoinApplicationStatus,
  useCancelMyGuildJoinApplication,
  useGuildApplicationList,
  useJoinGuildByInviteCode,
  useCheckGuildByInviteCode,
} from '@/hooks/api';
import { useLogout, useUpdateSiegeViewScope } from '@/features/auth/hooks/useAuth';
import { logger } from '@/shared/lib/logger';
import { clearClientAuth, isAuthenticated } from '@/shared/utils/auth';
import { readSiegeGuildViewSetting, writeSiegeGuildViewSetting, type SiegeGuildViewMode } from '@/shared/utils/siegeGuildView';
import { notifySiegeViewScopeChanged } from '@/shared/utils/siegeViewScope';
import { invalidateSiegeQueries } from '@/shared/utils/invalidateSiegeQueries';
import type { GuildApplicationItem, GuildSearchItem, UserInfo } from '@/features/auth/types/auth';

function toGuildRole(role?: string): UserInfo['guild_role'] {
  if (role === 'LEADER' || role === 'MANAGER' || role === 'MEMBER') {
    return role;
  }
  return undefined;
}

function readStoredUserInfo(): (UserInfo & { siege_view_scope?: string }) | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const savedUserInfo = localStorage.getItem('userInfo');
  if (!savedUserInfo) {
    return null;
  }

  try {
    return JSON.parse(savedUserInfo) as UserInfo & { siege_view_scope?: string };
  } catch (error) {
    logger.error('사용자 정보 파싱 실패', error);
    return null;
  }
}

const SECTION_ICON_SX = {
  width: 40,
  height: 40,
  borderRadius: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  bgcolor: (t: { palette: { primary: { main: string } } }) => alpha(t.palette.primary.main, 0.12),
  color: 'primary.main',
} as const;

function SettingsRow({
  label,
  value,
  children,
  showDivider = true,
}: {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
  showDivider?: boolean;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: children ? 'center' : 'flex-start',
        gap: 2,
        py: 2,
        borderBottom: showDivider ? '1px solid' : 'none',
        borderColor: 'divider',
        flexWrap: 'wrap',
      }}
    >
      <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ minWidth: 88 }}>
        {label}
      </Typography>
      {children ?? (
        <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right', wordBreak: 'break-all' }}>
          {value}
        </Typography>
      )}
    </Box>
  );
}

function SettingsSectionCard({
  title,
  icon,
  action,
  children,
  accent,
}: {
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  accent?: 'error';
}) {
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor: accent === 'error' ? (t) => alpha(t.palette.error.main, 0.35) : 'divider',
        bgcolor: accent === 'error' ? (t) => alpha(t.palette.error.main, 0.06) : undefined,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': {
          borderColor: accent === 'error' ? 'error.main' : 'primary.main',
          boxShadow: (t) =>
            accent === 'error'
              ? `0 0 0 1px ${alpha(t.palette.error.main, 0.2)}, 0 8px 32px rgba(0,0,0,0.25)`
              : `0 0 0 1px ${alpha(t.palette.primary.main, 0.15)}, 0 8px 32px rgba(0,0,0,0.25)`,
        },
      }}
    >
      <CardHeader
        avatar={
          <Box
            sx={{
              ...SECTION_ICON_SX,
              ...(accent === 'error' && {
                bgcolor: (t) => alpha(t.palette.error.main, 0.12),
                color: 'error.main',
              }),
            }}
          >
            {icon}
          </Box>
        }
        title={title}
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
        action={action}
        sx={{ pb: 0 }}
      />
      <CardContent sx={{ pt: 1 }}>{children}</CardContent>
    </Card>
  );
}

function readInitialSiegeGuildSetting(): {
  mode: SiegeGuildViewMode;
  selected: { guild_id: string; guild_name: string } | null;
} {
  if (typeof window === 'undefined') {
    return {
      mode: 'MY',
      selected: null,
    };
  }

  try {
    const setting = readSiegeGuildViewSetting();
    return {
      mode: setting.mode,
      selected:
        setting.mode === 'GUILD' && setting.guild_id && setting.guild_name
          ? { guild_id: setting.guild_id, guild_name: setting.guild_name }
          : null,
    };
  } catch {
    return {
      mode: 'MY',
      selected: null,
    };
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const initialUserInfo = readStoredUserInfo();
  const initialSiegeGuildSetting = readInitialSiegeGuildSetting();
  const [autoLoginEnabled, setAutoLoginEnabled] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('remember_login') === 'true',
  );
  const [siegeViewScope, setSiegeViewScope] = useState<string>(() => {
    const scope = initialUserInfo?.siege_view_scope;
    return typeof scope === 'string' && scope.trim().length > 0 ? scope : 'C';
  });
  const [siegeGuildViewMode, setSiegeGuildViewMode] = useState<SiegeGuildViewMode>(
    () => initialSiegeGuildSetting.mode,
  );
  const [siegeGuildViewSelected, setSiegeGuildViewSelected] = useState<{ guild_id: string; guild_name: string } | null>(
    () => initialSiegeGuildSetting.selected,
  );
  const [siegeGuildSearchKeyword, setSiegeGuildSearchKeyword] = useState('');

  const [editDialog, setEditDialog] = useState(false);
  const [guildJoinDialog, setGuildJoinDialog] = useState(false);
  const [guildJoinDialogTab, setGuildJoinDialogTab] = useState<'search' | 'invite'>('search');
  const [guildSearchKeyword, setGuildSearchKeyword] = useState('');
  const [selectedGuild, setSelectedGuild] = useState<{ guild_id: string; guild_name: string } | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [editFormData, setEditFormData] = useState({
    user_nm: '',
    email: '',
    phone: '',
  });

  // 사용자 정보 가져오기
  const [storedUserInfo, setStoredUserInfo] = useState<UserInfo | null>(initialUserInfo);

  // 길드 정보 조회
  const userGuildQuery = useUserGuild({
    enabled: true,
    retry: false, // 연결 실패 시 재시도하지 않음
    refetchOnWindowFocus: false, // 윈도우 포커스 시 리프레시하지 않음
  });

  const userInfo = useMemo<UserInfo | null>(() => {
    if (!storedUserInfo) {
      return null;
    }

    if (!userGuildQuery.data?.guild_id) {
      return storedUserInfo;
    }

    return {
      ...storedUserInfo,
      guild_id: userGuildQuery.data.guild_id,
      guild_name: userGuildQuery.data.guild_name,
      guild_role: toGuildRole(userGuildQuery.data.role) ?? storedUserInfo.guild_role,
    };
  }, [storedUserInfo, userGuildQuery.data]);

  // 길드 검색 Query
  const guildSearchQuery = useGuildSearch(
    { guild_name: guildSearchKeyword },
    {
      enabled: false, // 검색 버튼으로만 실행
    },
  );

  // (관리자) 전적 조회용 길드 검색 Query
  const siegeGuildSearchQuery = useGuildSearch(
    { guild_name: siegeGuildSearchKeyword },
    {
      enabled: false,
    },
  );

  const handleSearchGuild = () => {
    const keyword = guildSearchKeyword.trim();
    if (keyword.length < 2) {
      showToast.error('길드명을 2자 이상 입력하세요.');
      return;
    }
    // 새로운 검색 시 이전 선택 초기화
    setSelectedGuild(null);
    guildSearchQuery.refetch();
  };

  // 길드 가입 신청 Mutation (승인 대기)
  const applyJoinGuildMutation = useApplyGuildJoinApplication({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS') {
        showToast.success('길드 가입 신청이 완료되었습니다. 승인 대기 중입니다.');
        setGuildJoinDialog(false);
        setGuildSearchKeyword('');
        setSelectedGuild(null);
        myJoinStatusQuery.refetch();
      } else {
        throw new Error(res?.message || '길드 가입 신청에 실패했습니다.');
      }
    },
    onError: (error: Error) => {
      logger.error('길드 가입 신청 실패', error);
      showToast.error(error.message || '길드 가입 신청에 실패했습니다.');
    },
  });

  // 초대 코드로 길드 조회 Query
  const checkGuildByInviteCodeQuery = useCheckGuildByInviteCode(inviteCode, {
    enabled: false, // 수동으로 호출
  });

  // 초대 코드로 길드 가입 Mutation
  const joinGuildByInviteCodeMutation = useJoinGuildByInviteCode({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS') {
        showToast.success('길드에 가입되었습니다.');
        setGuildJoinDialog(false);
        setInviteCode('');
        // 사용자 정보 갱신
        if (typeof window !== 'undefined') {
          userGuildQuery.refetch();
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      } else {
        throw new Error(res.message || '길드 가입에 실패했습니다.');
      }
    },
    onError: (error: Error) => {
      logger.error('초대 코드로 길드 가입 실패', error);
      showToast.error(error.message || '길드 가입에 실패했습니다.');
    },
  });


  const shouldCheckGuildStatus = isClient && isAuthenticated() && !userInfo?.guild_id;

  // 길드 신청 목록 조회 (길드가 없을 때만: 생성 신청 상태 표시용)
  const guildApplicationListQuery = useGuildApplicationList({
    enabled: shouldCheckGuildStatus,
  });

  // 현재 사용자의 길드 생성 신청 찾기 (길드가 없는 경우)
  const myGuildApplication = guildApplicationListQuery.data?.find(
    (app: GuildApplicationItem) => app.user_id === userInfo?.user_id && !app.guild_id && app.status === 'PENDING'
  );

  // 내 길드 가입 신청(승인대기) 상태 (길드가 없을 때만)
  const myJoinStatusQuery = useMyGuildJoinApplicationStatus({
    enabled: shouldCheckGuildStatus,
  });
  const myJoinApplication = myJoinStatusQuery.data?.hasPendingJoinApplication
    ? (myJoinStatusQuery.data.application ?? null)
    : null;

  const cancelMyJoinApplicationMutation = useCancelMyGuildJoinApplication({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS') {
        showToast.success('가입 신청을 취소했습니다.');
        myJoinStatusQuery.refetch();
      } else {
        throw new Error(res?.message || '가입 신청 취소에 실패했습니다.');
      }
    },
    onError: (error: Error) => {
      logger.error('가입 신청 취소 실패', error);
      showToast.error(error.message || '가입 신청 취소에 실패했습니다.');
    },
  });

  const appVersion = '1.0.0';
  const buildDate = '2024-12-26';

  // siege_view_scope 업데이트 Mutation
  const updateSiegeViewScopeMutation = useUpdateSiegeViewScope({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS') {
        showToast.success('설정이 저장되었습니다.');
        if (typeof window !== 'undefined' && userInfo) {
          const updatedUserInfo = {
            ...userInfo,
            siege_view_scope: siegeViewScope,
          };
          localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
          setStoredUserInfo(updatedUserInfo);
        }
        notifySiegeViewScopeChanged();
        void invalidateSiegeQueries(queryClient);
      } else {
        throw new Error(res?.message || '설정 저장에 실패했습니다.');
      }
    },
    onError: (error: Error) => {
      logger.error('설정 저장 실패', error);
      showToast.error(error.message || '설정 저장에 실패했습니다.');
    },
  });

  const toggleAutoLogin = async (enabled: boolean) => {
    try {
      if (typeof window !== 'undefined') {
        if (enabled) {
          localStorage.setItem('remember_login', 'true');
          showToast.success('자동 로그인이 활성화되었습니다.');
        } else {
          localStorage.removeItem('remember_login');
          localStorage.removeItem('saved_user_id');
          localStorage.removeItem('saved_user_pw');
          showToast.info('자동 로그인이 비활성화되었습니다.');
        }
        setAutoLoginEnabled(enabled);
      }
    } catch (error) {
      logger.error('자동 로그인 설정 변경 실패', error);
      showToast.error('설정 변경에 실패했습니다.');
    }
  };

  const editUserInfo = () => {
    setEditFormData({
      user_nm: userInfo?.user_nm || '',
      email: '',
      phone: '',
    });
    setEditDialog(true);
  };

  const saveUserInfo = async () => {
    showToast.info('사용자 정보 수정 기능은 준비 중입니다.');
    setEditDialog(false);
  };

  const logoutMutation = useLogout({
    onSuccess: () => {
      if (typeof window !== 'undefined') {
        clearClientAuth();
      }
      // 로그아웃해도 로그인 페이지로 강제 이동하지 않음
      router.push('/');
    },
    onError: (error) => {
      logger.error('로그아웃 실패', error);
      if (typeof window !== 'undefined') {
        clearClientAuth();
      }
      // 실패하더라도 로그인 페이지로 강제 이동하지 않음
      router.push('/');
    },
  });

  const logout = async () => {
    logoutMutation.mutate({});
  };

  const handleJoinGuild = () => {
    if (guildJoinDialogTab === 'search') {
      if (!selectedGuild) {
        showToast.error('길드를 선택해주세요.');
        return;
      }
      applyJoinGuildMutation.mutate({ guild_id: selectedGuild.guild_id });
    } else {
      // 초대 코드로 가입
      if (!inviteCode || inviteCode.trim() === '') {
        showToast.error('초대 코드를 입력해주세요.');
        return;
      }
      joinGuildByInviteCodeMutation.mutate({ invite_key: inviteCode.trim() });
    }
  };

  const handleCheckInviteCode = () => {
    if (!inviteCode || inviteCode.trim() === '') {
      showToast.error('초대 코드를 입력해주세요.');
      return;
    }
    checkGuildByInviteCodeQuery.refetch();
  };



  const getStatusLabel = (status?: string) => {
    if (status === 'APPROVED') return '승인';
    if (status === 'REJECTED') return '반려';
    if (status === 'PENDING') return '대기';
    return '알 수 없음';
  };

  const getStatusColor = (status?: string): ChipProps['color'] => {
    if (status === 'APPROVED') return 'success';
    if (status === 'REJECTED') return 'error';
    if (status === 'PENDING') return 'warning';
    return 'default';
  };

  const getRoleLabel = (role?: string) => {
    if (role === 'LEADER') return '길드장';
    if (role === 'MEMBER') return '일반 멤버';
    return '정보 없음';
  };

  const getRoleColor = (role?: string): ChipProps['color'] => {
    if (role === 'LEADER') return 'error';
    if (role === 'MEMBER') return 'default';
    return 'default';
  };

  const isAdmin =
    Array.isArray(userInfo?.roles) &&
    userInfo.roles.some((role) => {
      const roleId = String(role?.role_id ?? '');
      // 관리자 = 시스템 운영자(RL0001)
      return roleId === 'RL0001';
    });

  const saveSiegeGuildViewSetting = () => {
    if (!isAdmin) return;
    if (siegeGuildViewMode === 'GUILD' && !siegeGuildViewSelected) {
      showToast.error('조회할 길드를 선택해주세요.');
      return;
    }
    writeSiegeGuildViewSetting({
      mode: siegeGuildViewMode,
      guild_id: siegeGuildViewMode === 'GUILD' ? siegeGuildViewSelected?.guild_id || null : null,
      guild_name: siegeGuildViewMode === 'GUILD' ? siegeGuildViewSelected?.guild_name || null : null,
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('smwr:siege-guild-view-changed'));
    }
    showToast.success('설정이 저장되었습니다.');
  };

  const displayName = userInfo?.user_nm || userInfo?.user_id || '게스트';
  const avatarLetter = (displayName.trim()[0] || '?').toUpperCase();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: { xs: 4, md: 6 } }}>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <PageHeader title="마이페이지" backPath="/" />

        <Card
          elevation={0}
          sx={{
            mb: 3,
            border: '1px solid',
            borderColor: 'divider',
            background: (t) =>
              `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.14)} 0%, ${alpha(t.palette.background.paper, 0.9)} 55%, ${t.palette.background.default} 100%)`,
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2.5, alignItems: { sm: 'center' } }}>
              <Avatar
                sx={{
                  width: { xs: 64, md: 72 },
                  height: { xs: 64, md: 72 },
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  border: '2px solid',
                  borderColor: (t) => alpha(t.palette.primary.light, 0.5),
                }}
              >
                {avatarLetter}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="overline" color="primary" sx={{ letterSpacing: 0.1, fontWeight: 700 }}>
                  내 계정
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.25, mb: 0.5 }}>
                  {displayName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                  {userInfo?.user_id || '로그인 정보 없음'}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
                  {userInfo?.guild_name ? (
                    <Chip label={userInfo.guild_name} size="small" color="primary" variant="outlined" />
                  ) : (
                    <Chip label="길드 미소속" size="small" variant="outlined" />
                  )}
                  {userInfo?.guild_role && (
                    <Chip label={getRoleLabel(userInfo.guild_role)} size="small" color={getRoleColor(userInfo.guild_role)} />
                  )}
                </Stack>
              </Box>
            </Box>
            <Stack direction="row" spacing={1} sx={{ mt: 2.5, flexWrap: 'wrap', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<SummarizeIcon />}
                onClick={() => router.push('/account-summary')}
              >
                계정 요약
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={() => router.push('/log-upload')}
              >
                로그 업로드
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<HistoryIcon />}
                onClick={() => router.push('/battle-history')}
              >
                전투 이력
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<NotificationsActiveIcon />}
                onClick={() => router.push('/notifications')}
              >
                알림
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
            gap: 3,
          }}
        >
          <SettingsSectionCard
            title="사용자 정보"
            icon={<AccountCircleIcon fontSize="small" />}
            action={
              <Button variant="text" color="primary" size="small" onClick={editUserInfo} startIcon={<EditIcon />}>
                수정
              </Button>
            }
          >
            <SettingsRow label="사용자명" value={userInfo?.user_nm || userInfo?.user_id || '정보 없음'} />
            <SettingsRow label="사용자 ID" value={userInfo?.user_id || '정보 없음'} showDivider={false} />
          </SettingsSectionCard>

          <SettingsSectionCard
            title="길드 정보"
            icon={<GroupIcon fontSize="small" />}
            action={
              !userInfo?.guild_id && !myJoinApplication ? (
                <Button
                  variant="text"
                  color="primary"
                  size="small"
                  onClick={() => setGuildJoinDialog(true)}
                  startIcon={<SearchIcon />}
                >
                  길드 가입
                </Button>
              ) : undefined
            }
          >
                {userInfo?.guild_id ? (
                  <>
                    <SettingsRow label="길드명" value={userInfo.guild_name || '정보 없음'} />
                    <SettingsRow label="등급" showDivider={false}>
                      <Chip
                        label={getRoleLabel(userInfo.guild_role)}
                        color={getRoleColor(userInfo.guild_role)}
                        size="small"
                      />
                    </SettingsRow>
                  </>
                ) : myJoinApplication ? (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: (t) => alpha(t.palette.warning.main, 0.35),
                        bgcolor: (t) => alpha(t.palette.warning.main, 0.08),
                      }}
                    >
                      <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
                        길드 가입 신청 중
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          길드명
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {myJoinApplication.guild_name || myJoinApplication.guild_id || '정보 없음'}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Chip label="대기" color="warning" size="medium" />
                      </Box>
                      {myJoinApplication.crt_date && (
                        <Typography variant="caption" color="text.secondary">
                          신청일: {isClient ? new Date(myJoinApplication.crt_date).toLocaleDateString('ko-KR') : '-'}
                        </Typography>
                      )}
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => {
                            const ok = window.confirm('길드 가입 신청을 취소할까요?');
                            if (!ok) return;
                            cancelMyJoinApplicationMutation.mutate({});
                          }}
                          disabled={cancelMyJoinApplicationMutation.isPending}
                        >
                          {cancelMyJoinApplicationMutation.isPending ? '취소 중...' : '신청 취소'}
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                ) : myGuildApplication ? (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: (t) => alpha(t.palette.background.paper, 0.6),
                      }}
                    >
                      <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
                        길드 생성 신청 중
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          길드명
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {myGuildApplication.guild_name || '정보 없음'}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Chip
                          label={getStatusLabel(myGuildApplication.status)}
                          color={getStatusColor(myGuildApplication.status)}
                          size="medium"
                        />
                      </Box>
                      {myGuildApplication.crt_date && (
                        <Typography variant="caption" color="text.secondary">
                          신청일: {isClient ? new Date(myGuildApplication.crt_date).toLocaleDateString('ko-KR') : '-'}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                      소속된 길드가 없습니다.
                    </Typography>
                    <Stack spacing={1.5} sx={{ maxWidth: 320, mx: 'auto' }}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setGuildJoinDialog(true)}
                        startIcon={<SearchIcon />}
                        fullWidth
                      >
                        길드 가입하기
                      </Button>
                      <Typography variant="caption" color="text.secondary">
                        또는
                      </Typography>
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => router.push('/guild-application')}
                        startIcon={<GroupIcon />}
                        fullWidth
                      >
                        길드 생성 신청
                      </Button>
                    </Stack>
                  </Box>
                )}
          </SettingsSectionCard>

          <SettingsSectionCard title="계정 설정" icon={<SecurityIcon fontSize="small" />}>
                <SettingsRow label="자동 로그인">
                  <Switch
                    checked={autoLoginEnabled}
                    onChange={(e) => toggleAutoLogin(e.target.checked)}
                    color="primary"
                  />
                </SettingsRow>
                <Box sx={{ pt: 1 }}>
                  <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
                    점령전 조회 범위
                  </Typography>
                  <FormControl fullWidth size="small" disabled={updateSiegeViewScopeMutation.isPending}>
                    <InputLabel>조회 범위 선택</InputLabel>
                    <Select
                      label="조회 범위 선택"
                      value={siegeViewScope}
                      onChange={(e) => {
                        const newValue = String(e.target.value);
                        setSiegeViewScope(newValue);
                        updateSiegeViewScopeMutation.mutate({
                          siege_view_scope: newValue,
                        });
                      }}
                    >
                      <MenuItem value="C">최근 시즌</MenuItem>
                      <MenuItem value="A">전체 시즌</MenuItem>
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    점령전 방덱 목록·상세·이력에서 조회할 시즌 범위를 설정합니다.
                  </Typography>

                  {isAdmin && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
                        소속길드(관리자)
                      </Typography>
                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>조회 대상 길드</InputLabel>
                        <Select
                          label="조회 대상 길드"
                          value={siegeGuildViewMode}
                          onChange={(e) => {
                            const next = e.target.value as SiegeGuildViewMode;
                            setSiegeGuildViewMode(next);
                            if (next !== 'GUILD') {
                              setSiegeGuildViewSelected(null);
                              setSiegeGuildSearchKeyword('');
                            }
                          }}
                        >
                          <MenuItem value="MY">내 길드</MenuItem>
                          <MenuItem value="ALL">전체</MenuItem>
                          <MenuItem value="GUILD">특정 길드</MenuItem>
                        </Select>
                      </FormControl>

                      {siegeGuildViewMode === 'GUILD' && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField
                              label="길드명 검색"
                              value={siegeGuildSearchKeyword}
                              onChange={(e) => setSiegeGuildSearchKeyword(e.target.value)}
                              placeholder="길드명을 2자 이상 입력"
                              fullWidth
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (siegeGuildSearchKeyword.trim().length < 2) {
                                    showToast.error('길드명을 2자 이상 입력하세요.');
                                    return;
                                  }
                                  siegeGuildSearchQuery.refetch();
                                }
                              }}
                            />
                            <Button
                              variant="outlined"
                              onClick={() => {
                                if (siegeGuildSearchKeyword.trim().length < 2) {
                                  showToast.error('길드명을 2자 이상 입력하세요.');
                                  return;
                                }
                                siegeGuildSearchQuery.refetch();
                              }}
                              disabled={siegeGuildSearchQuery.isFetching || siegeGuildSearchKeyword.trim().length < 2}
                              sx={{ minWidth: 96 }}
                            >
                              {siegeGuildSearchQuery.isFetching ? '검색 중...' : '검색'}
                            </Button>
                          </Box>

                          <Box
                            sx={{
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1.5,
                              overflow: 'hidden',
                              bgcolor: 'background.paper',
                              maxHeight: 240,
                              overflowY: 'auto',
                            }}
                          >
                            {(siegeGuildSearchQuery.data || []).length > 0 ? (
                              <List dense disablePadding>
                                {(siegeGuildSearchQuery.data || []).map((g: GuildSearchItem) => (
                                  <ListItemButton
                                    key={g.guild_id}
                                    selected={siegeGuildViewSelected?.guild_id === g.guild_id}
                                    onClick={() => setSiegeGuildViewSelected({ guild_id: g.guild_id, guild_name: g.guild_name })}
                                  >
                                    <ListItemText primary={g.guild_name} secondary={g.guild_id} />
                                  </ListItemButton>
                                ))}
                              </List>
                            ) : (
                              <Box sx={{ py: 2, px: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                  {siegeGuildSearchKeyword.trim().length < 2
                                    ? '길드명을 2자 이상 입력 후 검색하세요.'
                                    : '검색 결과가 없습니다.'}
                                </Typography>
                              </Box>
                            )}
                          </Box>

                          {siegeGuildViewSelected && (
                            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                선택한 길드
                              </Typography>
                              <Typography variant="body1" fontWeight={600}>
                                {siegeGuildViewSelected.guild_name}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}

                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="contained" onClick={saveSiegeGuildViewSetting}>
                          저장
                        </Button>
                      </Box>

                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        관리자만 “전체/특정 길드” 전적 조회가 가능합니다.
                      </Typography>
                    </Box>
                  )}
                </Box>
          </SettingsSectionCard>

          <SettingsSectionCard title="앱 정보" icon={<InfoIcon fontSize="small" />}>
            <SettingsRow label="앱 버전" value={appVersion} />
            <SettingsRow label="빌드 날짜" value={buildDate} showDivider={false} />
          </SettingsSectionCard>

          <SettingsSectionCard title="계정 관리" icon={<LogoutIcon fontSize="small" />} accent="error">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              현재 계정에서 로그아웃합니다. 자동 로그인 설정도 함께 해제됩니다.
            </Typography>
            <Button
              variant="outlined"
              color="error"
              fullWidth
              onClick={logout}
              startIcon={<LogoutIcon />}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
            </Button>
          </SettingsSectionCard>
        </Box>

        {/* 사용자 정보 수정 다이얼로그 */}
        <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EditIcon color="primary" />
                <Typography variant="h6">사용자 정보 수정</Typography>
              </Box>
              <IconButton onClick={() => setEditDialog(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="사용자명"
                value={editFormData.user_nm}
                onChange={(e) => setEditFormData({ ...editFormData, user_nm: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="이메일"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                fullWidth
              />
              <TextField
                label="전화번호"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setEditDialog(false)}>취소</Button>
            <Button onClick={saveUserInfo} variant="contained" color="primary">
              저장
            </Button>
          </DialogActions>
        </Dialog>

        {/* 길드 가입 다이얼로그 */}
        <Dialog open={guildJoinDialog} onClose={() => setGuildJoinDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SearchIcon color="primary" />
                <Typography variant="h6">길드 가입</Typography>
              </Box>
              <IconButton onClick={() => setGuildJoinDialog(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Tabs
              value={guildJoinDialogTab}
              onChange={(e, newValue) => {
                setGuildJoinDialogTab(newValue);
                setGuildSearchKeyword('');
                setSelectedGuild(null);
                setInviteCode('');
              }}
              sx={{ mb: 2 }}
            >
              <Tab label="길드 검색" value="search" />
              <Tab label="초대 코드" value="invite" />
            </Tabs>
            {guildJoinDialogTab === 'search' ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    label="길드명"
                    value={guildSearchKeyword}
                    onChange={(e) => setGuildSearchKeyword(e.target.value)}
                    placeholder="길드명을 입력하세요 (2자 이상)"
                    fullWidth
                      disabled={applyJoinGuildMutation.isPending}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchGuild();
                      }
                    }}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleSearchGuild}
                    disabled={
                        applyJoinGuildMutation.isPending ||
                      guildSearchQuery.isFetching ||
                      guildSearchKeyword.trim().length < 2
                    }
                    sx={{ minWidth: 96 }}
                  >
                    {guildSearchQuery.isFetching ? '검색 중...' : '검색'}
                  </Button>
                </Box>

                <Box
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                  }}
                >
                  {guildSearchQuery.isFetching ? (
                    <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                      <Skeleton variant="circular" width={22} height={22} />
                    </Box>
                  ) : (guildSearchQuery.data || []).length > 0 ? (
                    <>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 120px',
                          gap: 1,
                          px: 2,
                          py: 1,
                          bgcolor: 'action.hover',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                          길드명
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontWeight: 700, textAlign: 'right' }}
                        >
                          길드장
                        </Typography>
                      </Box>
                      <List dense disablePadding>
                      {(guildSearchQuery.data || []).map((g: GuildSearchItem) => (
                        <ListItemButton
                          key={g.guild_id}
                          selected={selectedGuild?.guild_id === g.guild_id}
                          onClick={() => setSelectedGuild({ guild_id: g.guild_id, guild_name: g.guild_name })}
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 120px',
                            gap: 1,
                            px: 2,
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                            {g.guild_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }} noWrap>
                            {g.leader_name || '-'}
                          </Typography>
                        </ListItemButton>
                      ))}
                      </List>
                    </>
                  ) : (
                    <Box sx={{ py: 3, px: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {guildSearchKeyword.trim().length < 2
                          ? '길드명을 2자 이상 입력 후 검색하세요.'
                          : '검색 결과가 없습니다.'}
                      </Typography>
                    </Box>
                  )}
                </Box>
                {selectedGuild && (
                  <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      선택한 길드
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {selectedGuild.guild_name}
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="초대 코드"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="초대 코드를 입력하세요"
                  fullWidth
                  required
                  disabled={joinGuildByInviteCodeMutation.isPending || checkGuildByInviteCodeQuery.isFetching}
                />
                <Button
                  variant="outlined"
                  onClick={handleCheckInviteCode}
                  disabled={!inviteCode || inviteCode.trim() === '' || checkGuildByInviteCodeQuery.isFetching}
                >
                  {checkGuildByInviteCodeQuery.isFetching ? '확인 중...' : '길드 정보 확인'}
                </Button>
                {checkGuildByInviteCodeQuery.data && checkGuildByInviteCodeQuery.data.result === 'SUCCESS' && (
                  <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      길드 정보
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {checkGuildByInviteCodeQuery.data.guild?.guild_name || '정보 없음'}
                    </Typography>
                    {checkGuildByInviteCodeQuery.data.guild?.guild_description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {checkGuildByInviteCodeQuery.data.guild.guild_description}
                      </Typography>
                    )}
                  </Box>
                )}
                {checkGuildByInviteCodeQuery.data && checkGuildByInviteCodeQuery.data.result === 'FAIL' && (
                  <Box sx={{ p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                    <Typography variant="body2" color="error">
                      {checkGuildByInviteCodeQuery.data.message || '유효하지 않은 초대 코드입니다.'}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setGuildJoinDialog(false)}>취소</Button>
            <Button
              onClick={handleJoinGuild}
              variant="contained"
              color="primary"
              disabled={
                (guildJoinDialogTab === 'search' && !selectedGuild) ||
                (guildJoinDialogTab === 'invite' && (!inviteCode || inviteCode.trim() === '')) ||
                (guildJoinDialogTab === 'invite' && (!checkGuildByInviteCodeQuery.data || checkGuildByInviteCodeQuery.data.result !== 'SUCCESS')) ||
                applyJoinGuildMutation.isPending ||
                joinGuildByInviteCodeMutation.isPending
              }
            >
              {guildJoinDialogTab === 'search'
                ? applyJoinGuildMutation.isPending
                  ? '신청 중...'
                  : '가입 신청'
                : joinGuildByInviteCodeMutation.isPending
                  ? '가입 중...'
                  : '가입하기'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}

