'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Divider,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import GroupIcon from '@mui/icons-material/Group';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import { useRouter } from 'next/navigation';
import {
  useGuildSettings,
  useGuildMembers,
  useGuildJoinApplicationList,
  useProcessGuildJoinApplication,
  useUpdateGuildMemberRole,
  useTransferGuildLeadership,
  useSaveGuildSettings,
  useGenerateInviteCode,
} from '@/hooks/api';
import { showToast } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import RefreshIcon from '@mui/icons-material/Refresh';

export default function GuildManagementPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedMemberForTransfer, setSelectedMemberForTransfer] = useState<string>('');
  const [roleChangeDialogOpen, setRoleChangeDialogOpen] = useState(false);
  const [selectedMemberForRoleChange, setSelectedMemberForRoleChange] = useState<{ user_id: string; current_role: string } | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [guildInfo, setGuildInfo] = useState<{ guild_name?: string; join_type?: string; description?: string; invite_key?: string }>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUserInfo = localStorage.getItem('userInfo');
      if (storedUserInfo) {
        try {
          const parsed = JSON.parse(storedUserInfo);
          setUserInfo(parsed);
          // 권한 체크
          const isLeaderOrManager = parsed.guild_role === 'LEADER' || parsed.guild_role === 'MANAGER';
          if (!parsed.guild_id || !isLeaderOrManager) {
            showToast.error('길드 관리 권한이 없습니다.');
            router.push('/');
          }
        } catch (error) {
          logger.error('사용자 정보 파싱 실패', error);
        }
      }
    }
  }, [router]);

  const isLeader = userInfo?.guild_role === 'LEADER';
  const isManager = userInfo?.guild_role === 'MANAGER';

  // 길드 정보 조회
  const guildSettingsQuery = useGuildSettings(userInfo?.guild_id || '', {
    enabled: !!userInfo?.guild_id && (isLeader || isManager),
    onSuccess: (data: any) => {
      logger.info('길드 정보 조회 성공', { data, guild_id: userInfo?.guild_id });
      console.log('길드 정보 응답:', data);
      // 길드 정보를 state에 저장
      setGuildInfo({
        guild_name: data.guild_name || '',
        join_type: data.join_type || 'APPROVAL',
        description: data.description || '',
        invite_key: data.invite_key,
      });
    },
    onError: (error: any) => {
      logger.error('길드 정보 조회 실패', error, { guild_id: userInfo?.guild_id });
    },
  });

  // 길드 멤버 목록 조회
  const guildMembersQuery = useGuildMembers(userInfo?.guild_id || '', {
    enabled: !!userInfo?.guild_id && (isLeader || isManager),
    onSuccess: (data: any) => {
      logger.info('길드 멤버 목록 조회 성공', { data, guild_id: userInfo?.guild_id });
    },
    onError: (error: any) => {
      logger.error('길드 멤버 목록 조회 실패', error, { guild_id: userInfo?.guild_id });
    },
  });

  // 길드 가입 신청 목록 조회
  const guildJoinApplicationListQuery = useGuildJoinApplicationList(userInfo?.guild_id || '', {
    enabled: !!userInfo?.guild_id && (isLeader || isManager),
  });

  // 초대 코드 채번 Mutation
  const generateInviteCodeMutation = useGenerateInviteCode({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS' && res.invite_code) {
        showToast.success('초대 코드가 생성되었습니다.');
        // 백엔드에서 최신 데이터를 가져오기 위해 refetch
        guildSettingsQuery.refetch();
      } else {
        throw new Error(res.message || '초대 코드 생성에 실패했습니다.');
      }
    },
    onError: (error: Error) => {
      logger.error('초대 코드 생성 실패', error);
      showToast.error(error.message || '초대 코드 생성에 실패했습니다.');
    },
  });

  // 길드 설정 저장 Mutation (초대 코드 변경용)
  const saveGuildSettingsMutation = useSaveGuildSettings({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS') {
        showToast.success('초대 코드가 변경되었습니다.');
        guildSettingsQuery.refetch();
      } else {
        throw new Error(res.message || '초대 코드 변경에 실패했습니다.');
      }
    },
    onError: (error: Error) => {
      logger.error('초대 코드 변경 실패', error);
      showToast.error(error.message || '초대 코드 변경에 실패했습니다.');
    },
  });

  // 길드 정보 저장 Mutation (가입 허용 여부, 설명 저장용)
  const saveGuildInfoMutation = useSaveGuildSettings({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS') {
        showToast.success('길드 정보가 저장되었습니다.');
        // refetch 후 초대 코드 확인을 위해 약간의 지연 후 refetch
        setTimeout(() => {
          guildSettingsQuery.refetch().then((result) => {
            logger.info('길드 정보 refetch 완료', { data: result.data });
            console.log('초대 코드:', result.data?.invite_key);
          });
        }, 500);
      } else {
        throw new Error(res.message || '길드 정보 저장에 실패했습니다.');
      }
    },
    onError: (error: Error) => {
      logger.error('길드 정보 저장 실패', error);
      showToast.error(error.message || '길드 정보 저장에 실패했습니다.');
    },
  });

  // 가입 신청 승인/반려 Mutation
  const processJoinApplicationMutation = useProcessGuildJoinApplication({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS') {
        showToast.success('처리되었습니다.');
        guildJoinApplicationListQuery.refetch();
        guildMembersQuery.refetch();
      } else {
        throw new Error(res.message || '처리에 실패했습니다.');
      }
    },
    onError: (error: Error) => {
      logger.error('가입 신청 처리 실패', error);
      showToast.error(error.message || '처리에 실패했습니다.');
    },
  });

  // 멤버 권한 변경 Mutation
  const updateMemberRoleMutation = useUpdateGuildMemberRole({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS') {
        showToast.success('권한이 변경되었습니다.');
        setRoleChangeDialogOpen(false);
        setSelectedMemberForRoleChange(null);
        guildMembersQuery.refetch();
        // 사용자 정보 갱신
        if (typeof window !== 'undefined') {
          const storedUserInfo = localStorage.getItem('userInfo');
          if (storedUserInfo) {
            try {
              const parsed = JSON.parse(storedUserInfo);
              if (parsed.user_id === selectedMemberForRoleChange?.user_id) {
                parsed.guild_role = newRole;
                localStorage.setItem('userInfo', JSON.stringify(parsed));
              }
            } catch (error) {
              logger.error('사용자 정보 업데이트 실패', error);
            }
          }
        }
      } else {
        throw new Error(res.message || '권한 변경에 실패했습니다.');
      }
    },
    onError: (error: Error) => {
      logger.error('권한 변경 실패', error);
      showToast.error(error.message || '권한 변경에 실패했습니다.');
    },
  });

  // 길드장 권한 위임 Mutation
  const transferLeadershipMutation = useTransferGuildLeadership({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS') {
        showToast.success('길드장 권한이 위임되었습니다.');
        setTransferDialogOpen(false);
        setSelectedMemberForTransfer('');
        guildMembersQuery.refetch();
        // 사용자 정보 갱신
        if (typeof window !== 'undefined') {
          const storedUserInfo = localStorage.getItem('userInfo');
          if (storedUserInfo) {
            try {
              const parsed = JSON.parse(storedUserInfo);
              if (parsed.user_id === selectedMemberForTransfer) {
                parsed.guild_role = 'LEADER';
                localStorage.setItem('userInfo', JSON.stringify(parsed));
              } else {
                parsed.guild_role = 'MEMBER';
                localStorage.setItem('userInfo', JSON.stringify(parsed));
              }
            } catch (error) {
              logger.error('사용자 정보 업데이트 실패', error);
            }
          }
        }
        // 페이지 새로고침
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        throw new Error(res.message || '권한 위임에 실패했습니다.');
      }
    },
    onError: (error: Error) => {
      logger.error('권한 위임 실패', error);
      showToast.error(error.message || '권한 위임에 실패했습니다.');
    },
  });

  const handleProcessApplication = (applicationId: string, status: 'APPROVED' | 'REJECTED') => {
    processJoinApplicationMutation.mutate({
      application_id: applicationId,
      status,
    });
  };

  const handleRoleChange = (member: any) => {
    const userId = member.user_id || member.usr_id;
    const currentRole = member.guild_role || member.role || 'MEMBER';
    setSelectedMemberForRoleChange({ user_id: userId, current_role: currentRole });
    setNewRole(currentRole);
    setRoleChangeDialogOpen(true);
  };

  const handleUpdateRole = () => {
    if (!selectedMemberForRoleChange || !newRole) return;
    updateMemberRoleMutation.mutate({
      user_id: selectedMemberForRoleChange.user_id,
      guild_role: newRole as 'LEADER' | 'MANAGER' | 'MEMBER',
    });
  };

  const handleTransferLeadership = (member: any) => {
    const userId = member.user_id || member.usr_id;
    setSelectedMemberForTransfer(userId);
    setTransferDialogOpen(true);
  };

  const handleConfirmTransfer = () => {
    if (!selectedMemberForTransfer) return;
    transferLeadershipMutation.mutate({
      new_leader_user_id: selectedMemberForTransfer,
    });
  };

  const handleChangeInviteCode = () => {
    if (window.confirm('초대 코드를 변경하시겠습니까? 변경된 초대 코드는 이전 코드를 대체합니다.')) {
      if (!userInfo?.guild_id) {
        showToast.error('길드 정보가 없습니다.');
        return;
      }
      generateInviteCodeMutation.mutate({
        guild_id: userInfo.guild_id,
      });
    }
  };

  const handleSaveGuildInfo = () => {
    if (!userInfo?.guild_id) {
      showToast.error('길드 정보가 없습니다.');
      return;
    }
    
    // 길드명 가져오기 (상태에 없으면 DB에서 조회한 값 사용)
    const guildName = guildInfo.guild_name !== undefined 
      ? guildInfo.guild_name 
      : (guildSettingsQuery.data?.guild_name || '');
    
    // 길드명 검증
    if (!guildName || guildName.trim() === '') {
      showToast.error('길드명을 입력해주세요.');
      return;
    }
    
    // 길드 정보 저장 (guild_name, join_type, description, invite_key)
    const params: any = {
      guild_id: userInfo.guild_id,
      guild_name: guildName.trim(),
      join_type: guildInfo.join_type !== undefined 
        ? guildInfo.join_type 
        : (guildSettingsQuery.data?.join_type || 'APPROVAL'),
      description: guildInfo.description !== undefined 
        ? guildInfo.description 
        : (guildSettingsQuery.data?.description || ''),
    };
    
    // 생성된 초대 코드가 있으면 포함
    if (guildSettingsQuery.data?.invite_key) {
      params.invite_key = guildSettingsQuery.data.invite_key;
    }
    
    saveGuildInfoMutation.mutate(params);
  };

  const getRoleLabel = (role?: string) => {
    if (role === 'LEADER') return '길드장';
    if (role === 'MANAGER') return '매니저';
    return '멤버';
  };

  const getRoleColor = (role?: string) => {
    if (role === 'LEADER') return 'error';
    if (role === 'MANAGER') return 'warning';
    return 'default';
  };

  if (!userInfo?.guild_id || (!isLeader && !isManager)) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">길드 관리 권한이 없습니다.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          길드 관리
        </Typography>
        <Typography variant="body1" color="text.secondary">
          길드 정보 및 멤버를 관리할 수 있습니다
        </Typography>
      </Box>

      {/* 3열 레이아웃 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)',
          },
          gap: 3,
        }}
      >
        {/* 길드 기본 정보 */}
        <Card>
          <CardHeader
            avatar={<GroupIcon color="primary" />}
            title="길드 기본 정보"
          />
          <CardContent>
            {guildSettingsQuery.isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : guildSettingsQuery.data ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    길드명
                  </Typography>
                  <TextField
                    value={guildInfo.guild_name !== undefined ? guildInfo.guild_name : (guildSettingsQuery.data?.guild_name || '')}
                    onChange={(e) => setGuildInfo({ ...guildInfo, guild_name: e.target.value })}
                    placeholder="길드명을 입력하세요"
                    size="small"
                    fullWidth
                  />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    초대코드로 가입 허용 여부
                  </Typography>
                  <FormControl component="fieldset">
                    <RadioGroup
                      row
                      value={guildInfo.join_type !== undefined ? guildInfo.join_type : (guildSettingsQuery.data?.join_type || 'APPROVAL')}
                      onChange={(e) => {
                        const newJoinType = e.target.value;
                        const previousJoinType = guildSettingsQuery.data?.join_type || 'APPROVAL';
                        setGuildInfo({ ...guildInfo, join_type: newJoinType });
                        
                        // APPROVAL에서 INVITE로 변경되면 초대 코드 채번 API 호출
                        if (previousJoinType === 'APPROVAL' && newJoinType === 'INVITE') {
                          if (!userInfo?.guild_id) {
                            showToast.error('길드 정보가 없습니다.');
                            return;
                          }
                          generateInviteCodeMutation.mutate({
                            guild_id: userInfo.guild_id,
                          });
                        }
                      }}
                    >
                      <FormControlLabel value="APPROVAL" control={<Radio size="small" />} label="N" />
                      <FormControlLabel value="INVITE" control={<Radio size="small" />} label="Y" />
                    </RadioGroup>
                  </FormControl>
                </Box>
                {(guildInfo.join_type === 'INVITE' || guildSettingsQuery.data?.join_type === 'INVITE') && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      초대코드
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField
                        value={guildSettingsQuery.data?.invite_key || ''}
                        InputProps={{
                          readOnly: true,
                        }}
                        size="small"
                        sx={{ flex: 1 }}
                        placeholder="초대 코드 생성 중..."
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={handleChangeInviteCode}
                        disabled={generateInviteCodeMutation.isPending || !isLeader}
                        title={isLeader ? '초대 코드 변경' : '길드장만 변경 가능'}
                      >
                        변경
                      </Button>
                    </Box>
                  </Box>
                )}
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    설명
                  </Typography>
                  <TextField
                    multiline
                    rows={3}
                    value={guildInfo.description !== undefined ? guildInfo.description : (guildSettingsQuery.data?.description || '')}
                    onChange={(e) => setGuildInfo({ ...guildInfo, description: e.target.value })}
                    placeholder="길드 설명을 입력하세요"
                    size="small"
                    fullWidth
                  />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    가입일
                  </Typography>
                  <Typography variant="body1">
                    {isMounted && guildSettingsQuery.data.crt_date ? new Date(guildSettingsQuery.data.crt_date).toLocaleDateString('ko-KR') : '-'}
                  </Typography>
                </Box>
                {(isLeader || isManager) && (
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={handleSaveGuildInfo}
                      disabled={saveGuildInfoMutation.isPending}
                    >
                      {saveGuildInfoMutation.isPending ? '저장 중...' : '저장'}
                    </Button>
                  </Box>
                )}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                길드 정보를 불러올 수 없습니다.
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* 길드 인원 */}
        <Card>
          <CardHeader
            avatar={<GroupIcon color="primary" />}
            title={`길드 인원 (${guildMembersQuery.data?.length || 0}명)`}
          />
          <CardContent>
            {guildMembersQuery.isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : guildMembersQuery.error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                길드 인원 정보를 불러오는 중 오류가 발생했습니다.
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  {guildMembersQuery.error instanceof Error ? guildMembersQuery.error.message : '알 수 없는 오류'}
                </Typography>
              </Alert>
            ) : guildMembersQuery.data ? (
              guildMembersQuery.data.length > 0 ? (
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell align="center">사용자 ID</TableCell>
                        <TableCell align="center">이름</TableCell>
                        <TableCell align="center">권한</TableCell>
                        {(isLeader || isManager) && <TableCell align="center">관리</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {guildMembersQuery.data.map((member: any, index: number) => {
                        // 필드명 매핑 (role -> guild_role, user_nm -> user_name)
                        const guildRole = member.guild_role || member.role;
                        const userName = member.user_name || member.user_nm;
                        
                        return (
                          <TableRow key={member.user_id || `member-${index}`}>
                            <TableCell align="center">{member.user_id}</TableCell>
                            <TableCell align="center">{userName}</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={getRoleLabel(guildRole)}
                                color={getRoleColor(guildRole) as any}
                                size="small"
                              />
                            </TableCell>
                            {(isLeader || isManager) && (
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                  {/* 길드장만 길드장 위임 가능 */}
                                  {isLeader && guildRole !== 'LEADER' && (
                                    <IconButton
                                      color="primary"
                                      size="small"
                                      onClick={() => handleTransferLeadership(member)}
                                      title="길드장 권한 위임"
                                    >
                                      <HowToRegIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                  {/* 매니저는 일반 길드원(MEMBER)만 관리 가능, 길드장은 모든 멤버 관리 가능 */}
                                  {((isLeader && guildRole !== 'LEADER') || (isManager && guildRole === 'MEMBER')) && (
                                    <IconButton
                                      color="primary"
                                      size="small"
                                      onClick={() => handleRoleChange(member)}
                                      title="권한 변경"
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                </Box>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  길드 인원이 없습니다.
                </Typography>
              )
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                길드 인원 정보를 불러올 수 없습니다.
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* 신청 인원 */}
        <Card>
          <CardHeader
            avatar={<PersonAddIcon color="primary" />}
            title={`가입 신청 (${guildJoinApplicationListQuery.data?.filter((app: any) => app.status === 'PENDING').length || 0}명)`}
          />
          <CardContent>
            {guildJoinApplicationListQuery.isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : guildJoinApplicationListQuery.data && guildJoinApplicationListQuery.data.filter((app: any) => app.status === 'PENDING').length > 0 ? (
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell align="center">사용자 ID</TableCell>
                      <TableCell align="center">이름</TableCell>
                      <TableCell align="center">처리</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {guildJoinApplicationListQuery.data
                      .filter((app: any) => app.status === 'PENDING')
                      .map((app: any) => (
                        <TableRow key={app.application_id}>
                          <TableCell align="center">{app.user_id}</TableCell>
                          <TableCell align="center">{app.user_name}</TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                              <IconButton
                                color="success"
                                size="small"
                                onClick={() => handleProcessApplication(app.application_id, 'APPROVED')}
                                disabled={processJoinApplicationMutation.isPending}
                              >
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleProcessApplication(app.application_id, 'REJECTED')}
                                disabled={processJoinApplicationMutation.isPending}
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                대기 중인 가입 신청이 없습니다.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* 권한 변경 다이얼로그 */}
      <Dialog open={roleChangeDialogOpen} onClose={() => setRoleChangeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>권한 변경</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {selectedMemberForRoleChange?.user_id}의 권한을 변경합니다.
            </Typography>
            <FormControl fullWidth>
              <InputLabel>권한</InputLabel>
              <Select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                label="권한"
                disabled={updateMemberRoleMutation.isPending}
              >
                <MenuItem value="MEMBER">멤버</MenuItem>
                {/* 매니저는 멤버만 변경 가능, 길드장은 매니저와 멤버 변경 가능 */}
                {isLeader && <MenuItem value="MANAGER">매니저</MenuItem>}
                {isLeader && <MenuItem value="LEADER">길드장</MenuItem>}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleChangeDialogOpen(false)} disabled={updateMemberRoleMutation.isPending}>
            취소
          </Button>
          <Button
            onClick={handleUpdateRole}
            variant="contained"
            disabled={updateMemberRoleMutation.isPending || !newRole}
          >
            {updateMemberRoleMutation.isPending ? '변경 중...' : '변경'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 길드장 권한 위임 다이얼로그 */}
      <Dialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>길드장 권한 위임</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            길드장 권한을 위임하면 현재 길드장 권한이 자동으로 멤버로 변경됩니다.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            {selectedMemberForTransfer}에게 길드장 권한을 위임하시겠습니까?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferDialogOpen(false)} disabled={transferLeadershipMutation.isPending}>
            취소
          </Button>
          <Button
            onClick={handleConfirmTransfer}
            variant="contained"
            color="error"
            disabled={transferLeadershipMutation.isPending}
          >
            {transferLeadershipMutation.isPending ? '위임 중...' : '위임'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

