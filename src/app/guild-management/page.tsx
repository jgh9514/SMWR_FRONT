'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
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
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import type { ChipProps } from '@mui/material/Chip';
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
  useKickGuildMember,
  useSaveGuildSettings,
  useGenerateInviteCode,
  useUpdateGuildMemberName,
} from '@/hooks/api';
import { showToast } from '@/shared/lib/notification';
import { getApiResultMessage, isApiSuccess } from '@/shared/lib/api/result';
import { logger } from '@/shared/lib/logger';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { GuildJoinApplication, GuildMember, GuildSettings, UserInfo } from '@/features/auth/types/auth';

type GuildMemberLike = GuildMember & {
  role?: string;
  usr_id?: string;
};

function toGuildRole(role?: string): UserInfo['guild_role'] {
  if (role === 'LEADER' || role === 'MANAGER' || role === 'MEMBER') {
    return role;
  }
  return undefined;
}

/** API가 application_id를 숫자로 줄 수 있어 문자열만 허용하던 필터와 제목 카운트가 어긋나지 않게 통일 */
function canEditMemberName(
  actorRole?: UserInfo['guild_role'],
  targetRole?: string,
  targetUserId?: string,
  actorUserId?: string,
): boolean {
  if (!actorRole || actorRole === 'MEMBER') {
    return false;
  }
  const role = targetRole || 'MEMBER';
  if (actorRole === 'MANAGER') {
    return role === 'MEMBER';
  }
  if (role === 'LEADER' && targetUserId !== actorUserId) {
    return false;
  }
  return true;
}

function canEditMemberRole(
  isLeader: boolean,
  isManager: boolean,
  targetRole?: string,
): boolean {
  const role = targetRole || 'MEMBER';
  if (isLeader && role !== 'LEADER') {
    return true;
  }
  return isManager && role === 'MEMBER';
}

function canEditMember(
  actorRole?: UserInfo['guild_role'],
  targetRole?: string,
  targetUserId?: string,
  actorUserId?: string,
  isLeader = false,
  isManager = false,
): boolean {
  return canEditMemberName(actorRole, targetRole, targetUserId, actorUserId)
    || canEditMemberRole(isLeader, isManager, targetRole);
}

function isRenderablePendingJoinApplication(
  app: GuildJoinApplication,
): app is GuildJoinApplication & { application_id: string | number } {
  const st = String(app.status ?? '').toUpperCase();
  if (st !== 'PENDING') return false;
  const id = app.application_id;
  if (id === null || id === undefined) return false;
  return String(id).trim().length > 0;
}

export default function GuildManagementPage() {
  const router = useRouter();
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const userInfoSnapshot = useSyncExternalStore(
    () => () => {},
    () => (typeof window === 'undefined' ? null : localStorage.getItem('userInfo')),
    () => null,
  );
  const userInfo = useMemo<UserInfo | null>(() => {
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
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedMemberForTransfer, setSelectedMemberForTransfer] = useState<string>('');
  const [memberEditDialogOpen, setMemberEditDialogOpen] = useState(false);
  const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<GuildMemberLike | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [originalMemberName, setOriginalMemberName] = useState('');
  const [editMemberRole, setEditMemberRole] = useState<string>('MEMBER');
  const [originalMemberRole, setOriginalMemberRole] = useState<string>('MEMBER');
  const [kickDialogOpen, setKickDialogOpen] = useState(false);
  const [selectedMemberForKick, setSelectedMemberForKick] = useState<GuildMemberLike | null>(null);
  const [kickReason, setKickReason] = useState<string>('');
  const [guildInfo, setGuildInfo] = useState<GuildSettings>({});

  const isLeader = userInfo?.guild_role === 'LEADER';
  const isManager = userInfo?.guild_role === 'MANAGER';

  useEffect(() => {
    if (!isClient || !userInfo) {
      return;
    }

    const isLeaderOrManager = userInfo.guild_role === 'LEADER' || userInfo.guild_role === 'MANAGER';
    if (!userInfo.guild_id || !isLeaderOrManager) {
      showToast.error('길드 관리 권한이 없습니다.');
      router.push('/');
    }
  }, [isClient, router, userInfo]);

  // 길드 정보 조회
  const guildSettingsQuery = useGuildSettings(userInfo?.guild_id || '', {
    enabled: !!userInfo?.guild_id && (isLeader || isManager),
    onSuccess: (data: GuildSettings) => {
      logger.info('길드 정보 조회 성공', { data, guild_id: userInfo?.guild_id });
      // 길드 정보를 state에 저장
      setGuildInfo({
        guild_name: data.guild_name || '',
        join_type: data.join_type || 'APPROVAL',
        description: data.guild_description || data.description || '',
        invite_key: data.invite_key,
      });
    },
    onError: (error: Error) => {
      logger.error('길드 정보 조회 실패', error, { guild_id: userInfo?.guild_id });
    },
  });

  // 길드 멤버 목록 조회
  const guildMembersQuery = useGuildMembers(userInfo?.guild_id || '', {
    enabled: !!userInfo?.guild_id && (isLeader || isManager),
    onSuccess: (data: GuildMember[]) => {
      logger.info('길드 멤버 목록 조회 성공', { data, guild_id: userInfo?.guild_id });
    },
    onError: (error: Error) => {
      logger.error('길드 멤버 목록 조회 실패', error, { guild_id: userInfo?.guild_id });
    },
  });

  // 길드 가입 신청 목록 조회
  const guildJoinApplicationListQuery = useGuildJoinApplicationList(userInfo?.guild_id || '', {
    enabled: !!userInfo?.guild_id && (isLeader || isManager),
  });

  const pendingGuildJoinApplications = useMemo(() => {
    const list = guildJoinApplicationListQuery.data;
    if (!list?.length) return [];
    return list.filter(isRenderablePendingJoinApplication);
  }, [guildJoinApplicationListQuery.data]);

  // 초대 코드 채번 Mutation
  const generateInviteCodeMutation = useGenerateInviteCode({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS' && (res.invite_code || res.invite_key)) {
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

  // 길드 정보 저장 Mutation (가입 허용 여부, 설명 저장용)
  const saveGuildInfoMutation = useSaveGuildSettings({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS') {
        showToast.success('길드 정보가 저장되었습니다.');
        if (typeof window !== 'undefined') {
          const storedUserInfo = localStorage.getItem('userInfo');
          if (storedUserInfo) {
            try {
              const parsed = JSON.parse(storedUserInfo) as UserInfo;
              const savedGuildName = guildInfo.guild_name?.trim()
                || guildSettingsQuery.data?.guild_name
                || parsed.guild_name;
              if (savedGuildName) {
                parsed.guild_name = savedGuildName;
                localStorage.setItem('userInfo', JSON.stringify(parsed));
              }
            } catch (error) {
              logger.error('길드명 localStorage 동기화 실패', error);
            }
          }
        }
        // refetch 후 초대 코드 확인을 위해 약간의 지연 후 refetch
        setTimeout(() => {
          guildSettingsQuery.refetch().then((result) => {
            logger.info('길드 정보 refetch 완료', { data: result.data });
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
    onSuccess: (res, variables) => {
      if (isApiSuccess(res)) {
        const fallback =
          variables.status === 'APPROVED' ? '가입 신청을 승인했습니다.' : '가입 신청을 반려했습니다.';
        showToast.success(getApiResultMessage(res, fallback));
      } else {
        showToast.error(getApiResultMessage(res, '처리에 실패했습니다.'));
      }
    },
    onError: (error: Error) => {
      logger.error('가입 신청 처리 실패', error);
      showToast.error(error.message || '처리에 실패했습니다.');
    },
    onSettled: () => {
      guildJoinApplicationListQuery.refetch();
      guildMembersQuery.refetch();
    },
  });

  // 길드 멤버 추방 Mutation
  const updateMemberNameMutation = useUpdateGuildMemberName({
    onError: (error: Error) => {
      logger.error('멤버 이름 변경 실패', error);
      showToast.error(error.message || '이름 변경에 실패했습니다.');
    },
  });

  const kickMemberMutation = useKickGuildMember({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS') {
        showToast.success('추방 처리되었습니다.');
        setKickDialogOpen(false);
        setSelectedMemberForKick(null);
        setKickReason('');
        guildMembersQuery.refetch();
      } else {
        throw new Error(res.message || '추방에 실패했습니다.');
      }
    },
    onError: (error: Error) => {
      logger.error('멤버 추방 실패', error);
      showToast.error(error.message || '추방에 실패했습니다.');
    },
  });

  // 멤버 권한 변경 Mutation
  const updateMemberRoleMutation = useUpdateGuildMemberRole({
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
              const parsed = JSON.parse(storedUserInfo) as UserInfo;
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

  const handleEditMember = (member: GuildMemberLike) => {
    const userId = member.user_id || member.usr_id;
    if (!userId) {
      showToast.error('대상 유저 정보가 없습니다.');
      return;
    }
    const guildRole = member.guild_role || member.role;
    const userName = member.user_name || member.user_nm || '';
    const currentRole = toGuildRole(guildRole) ?? 'MEMBER';
    setSelectedMemberForEdit(member);
    setEditMemberName(userName);
    setOriginalMemberName(userName);
    setEditMemberRole(currentRole);
    setOriginalMemberRole(currentRole);
    setMemberEditDialogOpen(true);
  };

  const closeMemberEditDialog = () => {
    setMemberEditDialogOpen(false);
    setSelectedMemberForEdit(null);
    setEditMemberName('');
    setOriginalMemberName('');
    setEditMemberRole('MEMBER');
    setOriginalMemberRole('MEMBER');
  };

  const syncUserGuildRoleInStorage = (targetUserId: string, role: UserInfo['guild_role']) => {
    if (typeof window === 'undefined') {
      return;
    }
    const storedUserInfo = localStorage.getItem('userInfo');
    if (!storedUserInfo) {
      return;
    }
    try {
      const parsed = JSON.parse(storedUserInfo) as UserInfo;
      if (parsed.user_id === targetUserId) {
        parsed.guild_role = role;
        localStorage.setItem('userInfo', JSON.stringify(parsed));
      }
    } catch (error) {
      logger.error('사용자 정보 업데이트 실패', error);
    }
  };

  const confirmMemberEdit = async () => {
    if (!selectedMemberForEdit?.user_id) {
      showToast.error('대상 유저 정보가 없습니다.');
      return;
    }

    const targetRole = selectedMemberForEdit.guild_role || selectedMemberForEdit.role;
    const canChangeName = canEditMemberName(
      userInfo?.guild_role,
      targetRole,
      selectedMemberForEdit.user_id,
      userInfo?.user_id,
    );
    const canChangeRole = canEditMemberRole(isLeader, isManager, targetRole);
    const trimmedName = editMemberName.trim();
    const nameChanged = canChangeName && trimmedName !== originalMemberName.trim();
    const roleChanged = canChangeRole && editMemberRole !== originalMemberRole;

    if (canChangeName && !trimmedName) {
      showToast.error('이름을 입력해주세요.');
      return;
    }

    if (!nameChanged && !roleChanged) {
      showToast.info('변경된 내용이 없습니다.');
      closeMemberEditDialog();
      return;
    }

    try {
      if (nameChanged) {
        const nameRes = await updateMemberNameMutation.mutateAsync({
          user_id: selectedMemberForEdit.user_id,
          user_nm: trimmedName,
        });
        if (!nameRes || nameRes.result !== 'SUCCESS') {
          throw new Error(nameRes.message || '이름 변경에 실패했습니다.');
        }
      }

      if (roleChanged) {
        const nextRole = toGuildRole(editMemberRole);
        if (!nextRole) {
          throw new Error('변경할 권한 정보가 올바르지 않습니다.');
        }
        const roleRes = await updateMemberRoleMutation.mutateAsync({
          user_id: selectedMemberForEdit.user_id,
          guild_role: nextRole,
        });
        if (!roleRes || roleRes.result !== 'SUCCESS') {
          throw new Error(roleRes.message || '권한 변경에 실패했습니다.');
        }
        syncUserGuildRoleInStorage(selectedMemberForEdit.user_id, nextRole);
      }

      showToast.success('저장되었습니다.');
      closeMemberEditDialog();
      guildMembersQuery.refetch();
    } catch (error) {
      logger.error('멤버 수정 실패', error);
      showToast.error(error instanceof Error ? error.message : '저장에 실패했습니다.');
    }
  };

  const handleKickMember = (member: GuildMemberLike) => {
    setSelectedMemberForKick(member);
    setKickReason('');
    setKickDialogOpen(true);
  };

  const confirmKickMember = () => {
    if (!selectedMemberForKick?.user_id) {
      showToast.error('대상 유저 정보가 없습니다.');
      return;
    }
    kickMemberMutation.mutate({
      user_id: selectedMemberForKick.user_id,
      leave_reason: kickReason.trim() || undefined,
    });
  };

  const handleTransferLeadership = (member: GuildMemberLike) => {
    const userId = member.user_id || member.usr_id;
    if (!userId) {
      showToast.error('대상 유저 정보가 없습니다.');
      return;
    }
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
    const description = guildInfo.description !== undefined
      ? guildInfo.description
      : (guildSettingsQuery.data?.guild_description || guildSettingsQuery.data?.description || '');

    const params: GuildSettings = {
      guild_id: userInfo.guild_id,
      guild_name: guildName.trim(),
      join_type: guildInfo.join_type !== undefined 
        ? guildInfo.join_type 
        : (guildSettingsQuery.data?.join_type || 'APPROVAL'),
      guild_description: description,
      description,
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

  const getRoleColor = (role?: string): ChipProps['color'] => {
    if (role === 'LEADER') return 'error';
    if (role === 'MANAGER') return 'warning';
    return 'default';
  };

  const selectedMemberTargetRole = selectedMemberForEdit?.guild_role || selectedMemberForEdit?.role;
  const canEditSelectedMemberName = canEditMemberName(
    userInfo?.guild_role,
    selectedMemberTargetRole,
    selectedMemberForEdit?.user_id,
    userInfo?.user_id,
  );
  const canEditSelectedMemberRole = canEditMemberRole(isLeader, isManager, selectedMemberTargetRole);
  const isMemberEditSaving = updateMemberNameMutation.isPending || updateMemberRoleMutation.isPending;

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
                    value={guildInfo.description !== undefined ? guildInfo.description : (guildSettingsQuery.data?.guild_description || guildSettingsQuery.data?.description || '')}
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
                    {isClient && guildSettingsQuery.data.crt_date ? new Date(guildSettingsQuery.data.crt_date).toLocaleDateString('ko-KR') : '-'}
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
                      {guildMembersQuery.data.map((member: GuildMemberLike, index: number) => {
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
                                color={getRoleColor(guildRole)}
                                size="small"
                              />
                            </TableCell>
                            {(isLeader || isManager) && (
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                  {canEditMember(
                                    userInfo?.guild_role,
                                    guildRole,
                                    member.user_id,
                                    userInfo?.user_id,
                                    isLeader,
                                    isManager,
                                  ) && (
                                    <IconButton
                                      color="primary"
                                      size="small"
                                      onClick={() => handleEditMember(member)}
                                      title="멤버 수정"
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  )}
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
                                  {/* 멤버 추방 */}
                                  {((isLeader && guildRole !== 'LEADER') || (isManager && guildRole === 'MEMBER')) &&
                                    member.user_id !== userInfo?.user_id && (
                                      <IconButton
                                        color="error"
                                        size="small"
                                        onClick={() => handleKickMember(member)}
                                        title="인원 삭제(추방)"
                                      >
                                        <CancelIcon fontSize="small" />
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
            title={`가입 신청 (${pendingGuildJoinApplications.length}명)`}
          />
          <CardContent>
            {guildJoinApplicationListQuery.isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : pendingGuildJoinApplications.length > 0 ? (
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
                    {pendingGuildJoinApplications.map((app) => {
                      const applicationId = String(app.application_id);
                      return (
                        <TableRow key={applicationId}>
                          <TableCell align="center">{app.user_id}</TableCell>
                          <TableCell align="center">{app.user_name ?? app.user_nm}</TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                              <IconButton
                                color="success"
                                size="small"
                                onClick={() => handleProcessApplication(applicationId, 'APPROVED')}
                                disabled={processJoinApplicationMutation.isPending}
                              >
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleProcessApplication(applicationId, 'REJECTED')}
                                disabled={processJoinApplicationMutation.isPending}
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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

      {/* 멤버 수정 다이얼로그 (이름·권한) */}
      <Dialog open={memberEditDialogOpen} onClose={closeMemberEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>멤버 수정</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            대상: <b>{selectedMemberForEdit?.user_id}</b>
          </Typography>
          {canEditSelectedMemberName && (
            <TextField
              label="이름"
              value={editMemberName}
              onChange={(e) => setEditMemberName(e.target.value)}
              fullWidth
              autoFocus
              inputProps={{ maxLength: 100 }}
              disabled={isMemberEditSaving}
              sx={{ mb: canEditSelectedMemberRole ? 2 : 0 }}
            />
          )}
          {canEditSelectedMemberRole && (
            <FormControl fullWidth>
              <InputLabel>권한</InputLabel>
              <Select
                value={editMemberRole}
                onChange={(e) => setEditMemberRole(e.target.value)}
                label="권한"
                disabled={isMemberEditSaving}
              >
                <MenuItem value="MEMBER">멤버</MenuItem>
                {isLeader && <MenuItem value="MANAGER">매니저</MenuItem>}
                {isLeader && <MenuItem value="LEADER">길드장</MenuItem>}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeMemberEditDialog} disabled={isMemberEditSaving}>
            취소
          </Button>
          <Button
            onClick={confirmMemberEdit}
            variant="contained"
            disabled={isMemberEditSaving || (canEditSelectedMemberName && !editMemberName.trim())}
          >
            {isMemberEditSaving ? '저장 중...' : '저장'}
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

      {/* 멤버 추방 확인 다이얼로그 */}
      <Dialog open={kickDialogOpen} onClose={() => setKickDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>멤버 추방</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            추방하면 해당 사용자는 길드에서 즉시 제외됩니다. (되돌릴 수 없습니다)
          </Alert>
          <Typography variant="body2" sx={{ mb: 2 }}>
            대상: <b>{selectedMemberForKick?.user_id}</b>
          </Typography>
          <TextField
            label="사유 (선택)"
            value={kickReason}
            onChange={(e) => setKickReason(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKickDialogOpen(false)}>취소</Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmKickMember}
            disabled={kickMemberMutation.isPending}
          >
            {kickMemberMutation.isPending ? '처리 중...' : '추방'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

