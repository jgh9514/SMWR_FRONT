'use client';

import { useEffect, useState } from 'react';
import {
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
  Switch,
  TextField,
  Typography,
  Autocomplete,
  CircularProgress,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SecurityIcon from '@mui/icons-material/Security';
import InfoIcon from '@mui/icons-material/Info';
import LogoutIcon from '@mui/icons-material/Logout';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import GroupIcon from '@mui/icons-material/Group';
import SearchIcon from '@mui/icons-material/Search';
import { useRouter } from 'next/navigation';
import { showToast } from '@/shared/lib/notification';
import {
  useUserGuild,
  useGuildSearch,
  useJoinGuild,
  useGuildJoinApplication,
  useGuildApplicationList,
  useJoinGuildByInviteCode,
  useCheckGuildByInviteCode,
} from '@/hooks/api';
import { useLogout, useUpdateSiegeViewScope } from '@/features/auth/hooks/useAuth';
import { isEmpty } from '@/shared/utils/util';
import { logger } from '@/shared/lib/logger';
import { clearClientAuth } from '@/shared/utils/auth';

export default function SettingsPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [autoLoginEnabled, setAutoLoginEnabled] = useState(false);
  const [siegeViewScope, setSiegeViewScope] = useState<string>('C');

  useEffect(() => {
    setIsMounted(true);
  }, []);
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
  const [userInfo, setUserInfo] = useState<any>(null);

  // 길드 정보 조회
  const userGuildQuery = useUserGuild({
    enabled: true,
    retry: false, // 연결 실패 시 재시도하지 않음
    refetchOnWindowFocus: false, // 윈도우 포커스 시 리프레시하지 않음
  });

  // 길드 정보 업데이트
  useEffect(() => {
    if (userGuildQuery.data && userGuildQuery.data.guild_id && userInfo) {
      setUserInfo({
        ...userInfo,
        guild_id: userGuildQuery.data.guild_id,
        guild_name: userGuildQuery.data.guild_name,
        guild_role: userGuildQuery.data.role,
      });
    }
  }, [userGuildQuery.data]);

  // 길드 검색 Query
  const guildSearchQuery = useGuildSearch(
    { guild_name: guildSearchKeyword },
    {
      enabled: guildSearchKeyword.length >= 2,
    },
  );

  // 길드 가입 신청 Mutation (일반 사용자가 길드에 가입 신청)
  const guildJoinApplicationMutation = useGuildJoinApplication({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS') {
        showToast.success('길드 가입 신청이 완료되었습니다.');
        setGuildJoinDialog(false);
        setGuildSearchKeyword('');
        setSelectedGuild(null);
        // 사용자 정보 갱신
        if (typeof window !== 'undefined') {
          const storedUserInfo = localStorage.getItem('userInfo');
          if (storedUserInfo) {
            try {
              const parsed = JSON.parse(storedUserInfo);
              userGuildQuery.refetch();
            } catch (error) {
              logger.error('사용자 정보 업데이트 실패', error);
            }
          }
        }
      } else {
        throw new Error(res.message || '길드 가입 신청에 실패했습니다.');
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


  // 길드 신청 목록 조회 (사용자용 - 자신의 신청 상태 확인)
  const guildApplicationListQuery = useGuildApplicationList({
    enabled: true, // 항상 조회하여 자신의 신청 상태도 확인
  });

  // 현재 사용자의 길드 생성 신청 찾기 (길드가 없는 경우)
  const myGuildApplication = guildApplicationListQuery.data?.find(
    (app: any) => app.user_id === userInfo?.user_id && !app.guild_id && app.status === 'PENDING'
  );

  const appVersion = '1.0.0';
  const buildDate = '2024-12-26';

  // siege_view_scope 업데이트 Mutation
  const updateSiegeViewScopeMutation = useUpdateSiegeViewScope({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS') {
        showToast.success('설정이 저장되었습니다.');
        // localStorage의 userInfo 업데이트
        if (typeof window !== 'undefined' && userInfo) {
          const updatedUserInfo = {
            ...userInfo,
            siege_view_scope: siegeViewScope,
          };
          localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
          setUserInfo(updatedUserInfo);
        }
      } else {
        throw new Error(res?.message || '설정 저장에 실패했습니다.');
      }
    },
    onError: (error: Error) => {
      logger.error('설정 저장 실패', error);
      showToast.error(error.message || '설정 저장에 실패했습니다.');
    },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRemember = localStorage.getItem('remember_login');
      setAutoLoginEnabled(savedRemember === 'true');

      // 사용자 정보 가져오기
      const storedUserInfo = localStorage.getItem('userInfo');
      if (storedUserInfo) {
        try {
          const parsed = JSON.parse(storedUserInfo);
          setUserInfo(parsed);
          // siege_view_scope 설정
          const scope = parsed.siege_view_scope;
          if (typeof scope === 'string' && scope.trim().length > 0) {
            setSiegeViewScope(scope);
          } else {
            setSiegeViewScope('C'); // 기본값
          }
        } catch (error) {
          logger.error('사용자 정보 파싱 실패', error);
        }
      }
    }
  }, []);

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
      console.error('자동 로그인 설정 변경 실패:', error);
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
    try {
      // TODO: API 호출
      showToast.success('사용자 정보가 수정되었습니다.');
      setEditDialog(false);
    } catch (error) {
      console.error('사용자 정보 수정 실패:', error);
      showToast.error('사용자 정보 수정에 실패했습니다.');
    }
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
      console.error('로그아웃 실패:', error);
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
      guildJoinApplicationMutation.mutate({ guild_id: selectedGuild.guild_id });
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

  const getStatusColor = (status?: string) => {
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

  const getRoleColor = (role?: string) => {
    if (role === 'LEADER') return 'error';
    if (role === 'MEMBER') return 'default';
    return 'default';
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8f9fa', py: 4 }}>
      <Container>
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography variant="h4" sx={{ fontWeight: 300, mb: 1, color: '#2c3e50' }}>
            설정
          </Typography>
          <Typography variant="body1" color="text.secondary">
            계정 및 앱 설정을 관리하세요
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 3, flexWrap: 'wrap' }}>
          {/* 사용자 정보 */}
          <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 calc(50% - 12px)' } }}>
            <Card sx={{ height: '100%' }}>
              <CardHeader
                avatar={<AccountCircleIcon color="primary" />}
                title="사용자 정보"
                action={
                  <Button
                    variant="text"
                    color="primary"
                    size="small"
                    onClick={editUserInfo}
                    startIcon={<EditIcon />}
                  >
                    수정
                  </Button>
                }
              />
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="body1" fontWeight={600}>
                    사용자명
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {userInfo?.user_nm || userInfo?.user_id || '정보 없음'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 2 }}>
                  <Typography variant="body1" fontWeight={600}>
                    사용자 ID
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {userInfo?.user_id || '정보 없음'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* 길드 정보 */}
          <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 calc(50% - 12px)' } }}>
            <Card sx={{ height: '100%' }}>
              <CardHeader
                avatar={<GroupIcon color="primary" />}
                title="길드 정보"
                action={
                  !userInfo?.guild_id && (
                    <Button
                      variant="text"
                      color="primary"
                      size="small"
                      onClick={() => setGuildJoinDialog(true)}
                      startIcon={<SearchIcon />}
                    >
                      길드 가입
                    </Button>
                  )
                }
              />
              <CardContent>
                {userInfo?.guild_id ? (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body1" fontWeight={600}>
                        길드명
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {userInfo.guild_name || '정보 없음'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
                      <Typography variant="body1" fontWeight={600}>
                        등급
                      </Typography>
                      <Chip
                        label={getRoleLabel(userInfo.guild_role)}
                        color={getRoleColor(userInfo.guild_role) as any}
                        size="small"
                      />
                    </Box>
                  </>
                ) : myGuildApplication ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Box sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
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
                          color={getStatusColor(myGuildApplication.status) as any}
                          size="medium"
                        />
                      </Box>
                      {myGuildApplication.crt_date && (
                        <Typography variant="caption" color="text.secondary">
                          신청일: {isMounted ? new Date(myGuildApplication.crt_date).toLocaleDateString('ko-KR') : '-'}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      소속된 길드가 없습니다.
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setGuildJoinDialog(true)}
                        startIcon={<SearchIcon />}
                        fullWidth
                        sx={{ maxWidth: 300 }}
                      >
                        길드 가입하기
                      </Button>
                      <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>
                        또는
                      </Typography>
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => router.push('/guild-application')}
                        startIcon={<GroupIcon />}
                        fullWidth
                        sx={{ maxWidth: 300 }}
                      >
                        길드 생성 신청
                      </Button>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* 계정 설정 */}
          <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 calc(50% - 12px)' } }}>
            <Card sx={{ height: '100%' }}>
              <CardHeader avatar={<SecurityIcon color="primary" />} title="계정 설정" />
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body1" fontWeight={600}>
                      자동 로그인
                    </Typography>
                  </Box>
                  <Switch
                    checked={autoLoginEnabled}
                    onChange={(e) => toggleAutoLogin(e.target.checked)}
                    color="primary"
                  />
                </Box>
                <Box sx={{ py: 2 }}>
                  <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
                    점령전 조회 범위
                  </Typography>
                  <Autocomplete
                    value={siegeViewScope}
                    onChange={(event, newValue) => {
                      if (newValue && typeof newValue === 'string') {
                        setSiegeViewScope(newValue);
                        updateSiegeViewScopeMutation.mutate({ 
                          siege_view_scope: newValue
                        });
                      }
                    }}
                    options={['A', 'C']}
                    getOptionLabel={(option) => {
                      return option === 'A' ? '전체 시즌' : '최근 시즌';
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="조회 범위 선택"
                        variant="outlined"
                        size="small"
                      />
                    )}
                    disabled={updateSiegeViewScopeMutation.isPending}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    점령전 이력 페이지에서 조회할 시즌 범위를 설정합니다.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* 앱 정보 */}
          <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 calc(50% - 12px)' } }}>
            <Card sx={{ height: '100%' }}>
              <CardHeader avatar={<InfoIcon color="primary" />} title="앱 정보" />
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="body1" fontWeight={600}>
                    앱 버전
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {appVersion}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 2 }}>
                  <Typography variant="body1" fontWeight={600}>
                    빌드 날짜
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {buildDate}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* 계정 관리 */}
          <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 calc(50% - 12px)' } }}>
            <Card
              sx={{
                height: '100%',
                background: 'linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%)',
                border: '1px solid #fed7d7',
              }}
            >
              <CardHeader avatar={<LogoutIcon color="error" />} title="계정 관리" />
              <CardContent>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="error" sx={{ mb: 3 }}>
                    현재 계정에서 로그아웃합니다.
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    size="large"
                    onClick={logout}
                    startIcon={<LogoutIcon />}
                  >
                    로그아웃
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
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
                <Autocomplete
                  options={guildSearchQuery.data || []}
                  getOptionLabel={(option) => option.guild_name || ''}
                  loading={guildSearchQuery.isFetching}
                  inputValue={guildSearchKeyword}
                  onInputChange={(event, newInputValue) => {
                    setGuildSearchKeyword(newInputValue);
                  }}
                  value={selectedGuild}
                  onChange={(event, newValue) => {
                    setSelectedGuild(newValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="길드 검색"
                      placeholder="길드명을 입력하여 검색하세요 (2자 이상)"
                      required
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {guildSearchQuery.isFetching ? (
                              <CircularProgress color="inherit" size={20} />
                            ) : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  noOptionsText={
                    guildSearchKeyword.length < 2
                      ? '길드명을 2자 이상 입력하세요'
                      : '검색 결과가 없습니다'
                  }
                  disabled={guildJoinApplicationMutation.isPending}
                />
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
                guildJoinApplicationMutation.isPending ||
                joinGuildByInviteCodeMutation.isPending
              }
            >
              {guildJoinDialogTab === 'search'
                ? guildJoinApplicationMutation.isPending
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

