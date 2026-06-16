'use client';

import { useState, useSyncExternalStore, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Alert,
  Tab,
  Tabs,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  CircularProgress,
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import SearchIcon from '@mui/icons-material/Search';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CancelIcon from '@mui/icons-material/Cancel';
import {
  useGuildSearch,
  useApplyGuildJoinApplication,
  useJoinGuildByInviteCode,
  useCheckGuildByInviteCode,
  useMyGuildJoinApplicationStatus,
  useCancelMyGuildJoinApplication,
} from '@/features/auth/hooks/useAuth';
import { isAuthenticated } from '@/shared/utils/auth';
import { handleApiError } from '@/shared/lib/error-handler';
import { getApiResultMessage, isApiSuccess } from '@/shared/lib/api/result';
import { showToast } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import type { UserInfo } from '@/features/auth/types/auth';

export default function GuildJoinPage() {
  const router = useRouter();
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const loggedIn = isClient ? isAuthenticated() : false;
  const userInfo = useMemo<UserInfo | null>(() => {
    if (!isClient) return null;
    try {
      const stored = localStorage.getItem('userInfo');
      return stored ? (JSON.parse(stored) as UserInfo) : null;
    } catch (e) {
      logger.error('사용자 정보 파싱 실패', e);
      return null;
    }
  }, [isClient]);

  const [tab, setTab] = useState<'search' | 'invite'>('search');

  // 길드 검색 탭
  const [searchName, setSearchName] = useState('');
  const [appliedMessage, setAppliedMessage] = useState<Record<string, string>>({});

  // 초대 코드 탭
  const [inviteCode, setInviteCode] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');

  // 내 신청 현황
  const { data: myStatus, refetch: refetchStatus } = useMyGuildJoinApplicationStatus({
    enabled: loggedIn,
  });

  // 길드 검색
  const { data: searchResults = [], isFetching: isSearching } = useGuildSearch(
    { guild_name: searchName },
    { enabled: loggedIn && searchName.length >= 2 },
  );

  // 초대 코드 길드 확인
  const { data: inviteGuildInfo, isFetching: isCheckingInvite } = useCheckGuildByInviteCode(inviteCode, {
    enabled: loggedIn && inviteCode.length > 0,
  });

  const applyMutation = useApplyGuildJoinApplication({
    onSuccess: (res) => {
      if (isApiSuccess(res)) {
        showToast.success(
          getApiResultMessage(res, '길드 가입 신청이 완료되었습니다. 길드장/매니저 승인을 기다려주세요.'),
        );
        refetchStatus();
      } else {
        showToast.error(getApiResultMessage(res, '가입 신청에 실패했습니다.'));
      }
    },
    onError: (e: Error) => {
      showToast.error(handleApiError(e).message);
    },
  });

  const inviteMutation = useJoinGuildByInviteCode({
    onSuccess: (res) => {
      if (res?.result === 'SUCCESS') {
        showToast.success('길드에 가입되었습니다!');
        router.push('/settings');
      } else {
        showToast.error(res?.message || '초대 코드가 유효하지 않습니다.');
      }
    },
    onError: (e: Error) => {
      showToast.error(e.message || '초대 코드가 유효하지 않습니다.');
    },
  });

  const cancelMutation = useCancelMyGuildJoinApplication({
    onSuccess: (res) => {
      if (res?.result === 'SUCCESS') {
        showToast.success('가입 신청이 취소되었습니다.');
        refetchStatus();
      } else {
        showToast.error(res?.message || '취소에 실패했습니다.');
      }
    },
    onError: (e: Error) => {
      showToast.error(e.message || '취소에 실패했습니다.');
    },
  });

  const handleCheckInvite = () => {
    setInviteCode(inviteCodeInput.trim());
  };

  const handleJoinByInvite = () => {
    if (!inviteCode) return;
    inviteMutation.mutate({ invite_key: inviteCode });
  };

  if (!isClient) return null;

  if (!loggedIn) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          로그인 후 이용할 수 있습니다.
        </Alert>
        <Button variant="contained" onClick={() => router.push('/login')}>
          로그인
        </Button>
      </Container>
    );
  }

  if (userInfo?.guild_id) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="warning">
          이미 길드에 소속되어 있습니다. 다른 길드에 가입하려면 먼저 현재 길드에서 탈퇴해주세요.
        </Alert>
      </Container>
    );
  }

  const hasPending = myStatus?.hasPendingJoinApplication;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: { xs: 1, sm: 2 },
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        pt: { xs: 2, sm: 4 },
      }}
    >
      <Container maxWidth="sm" sx={{ width: '100%' }}>
        <Card sx={{ borderRadius: 2, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
            {/* 헤더 */}
            <Button
              variant="text"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.back()}
              sx={{ mb: 2 }}
            >
              뒤로가기
            </Button>

            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 72,
                  height: 72,
                  mb: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '50%',
                }}
              >
                <GroupIcon sx={{ color: 'white', fontSize: 36 }} />
              </Box>
              <Typography variant="h5" fontWeight={700} color="#2d3748">
                길드 가입
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                길드를 검색하거나 초대 코드로 가입하세요
              </Typography>
            </Box>

            {/* 신청 대기 중 배너 */}
            {hasPending && myStatus?.application && (
              <Alert
                severity="info"
                sx={{ mb: 3 }}
                action={
                  <IconButton
                    size="small"
                    color="inherit"
                    onClick={() => cancelMutation.mutate({})}
                    disabled={cancelMutation.isPending}
                    aria-label="신청 취소"
                  >
                    <CancelIcon fontSize="small" />
                  </IconButton>
                }
              >
                <Typography variant="body2" fontWeight={600}>
                  승인 대기 중: {myStatus.application.guild_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  오른쪽 버튼을 눌러 신청을 취소할 수 있습니다.
                </Typography>
              </Alert>
            )}

            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="fullWidth"
              sx={{ mb: 3 }}
            >
              <Tab value="search" label="길드 검색" icon={<SearchIcon />} iconPosition="start" />
              <Tab value="invite" label="초대 코드" icon={<VpnKeyIcon />} iconPosition="start" />
            </Tabs>

            {tab === 'search' && (
              <Box>
                <TextField
                  label="길드명으로 검색"
                  placeholder="두 글자 이상 입력하세요"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  fullWidth
                  InputProps={{
                    endAdornment: isSearching ? <CircularProgress size={20} /> : <SearchIcon color="action" />,
                  }}
                  disabled={hasPending}
                  helperText={hasPending ? '신청 취소 후 다시 신청할 수 있습니다.' : undefined}
                />

                {searchResults.length > 0 && (
                  <List sx={{ mt: 2 }}>
                    {searchResults.map((guild, idx) => (
                      <Box key={guild.guild_id}>
                        {idx > 0 && <Divider />}
                        <ListItem sx={{ px: 0, py: 1.5 }}>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography fontWeight={600}>{guild.guild_name}</Typography>
                                {guild.rating != null && (
                                  <Chip label={`시즌 ${guild.rating}`} size="small" variant="outlined" />
                                )}
                              </Box>
                            }
                            secondary={guild.leader_name ? `길드장: ${guild.leader_name}` : undefined}
                          />
                          <ListItemSecondaryAction>
                            <Button
                              variant="contained"
                              size="small"
                              disabled={
                                hasPending ||
                                applyMutation.isPending ||
                                myStatus?.application?.guild_id === guild.guild_id
                              }
                              onClick={() => {
                                if (applyMutation.isPending) return;
                                applyMutation.mutate({
                                  guild_id: guild.guild_id,
                                  message: appliedMessage[guild.guild_id] ?? '',
                                });
                              }}
                            >
                              {myStatus?.application?.guild_id === guild.guild_id ? '신청 완료' : '가입 신청'}
                            </Button>
                          </ListItemSecondaryAction>
                        </ListItem>
                      </Box>
                    ))}
                  </List>
                )}

                {searchName.length >= 2 && !isSearching && searchResults.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                    검색 결과가 없습니다.
                  </Typography>
                )}
              </Box>
            )}

            {tab === 'invite' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="초대 코드"
                  placeholder="초대 코드를 입력하세요"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                  fullWidth
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCheckInvite();
                  }}
                />

                <Button
                  variant="outlined"
                  onClick={handleCheckInvite}
                  disabled={!inviteCodeInput.trim() || isCheckingInvite}
                  startIcon={isCheckingInvite ? <CircularProgress size={16} /> : <SearchIcon />}
                >
                  길드 확인
                </Button>

                {inviteCode && inviteGuildInfo && (
                  <Card variant="outlined" sx={{ p: 2 }}>
                    {inviteGuildInfo.result === 'SUCCESS' && inviteGuildInfo.guild ? (
                      <Box>
                        <Typography fontWeight={700} sx={{ mb: 0.5 }}>
                          {inviteGuildInfo.guild.guild_name}
                        </Typography>
                        {inviteGuildInfo.guild.guild_description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {inviteGuildInfo.guild.guild_description}
                          </Typography>
                        )}
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={handleJoinByInvite}
                          disabled={inviteMutation.isPending}
                        >
                          {inviteMutation.isPending ? '가입 중...' : '이 길드에 가입'}
                        </Button>
                      </Box>
                    ) : (
                      <Alert severity="error">유효하지 않은 초대 코드입니다.</Alert>
                    )}
                  </Card>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
