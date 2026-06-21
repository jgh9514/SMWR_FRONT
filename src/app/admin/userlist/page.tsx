'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Stack,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { useRouter } from 'next/navigation';
import { useUserList, useUserSave } from '@/hooks/api';
import { searchDataExtraction } from '@/shared/utils/util';
import { showToast, confirm } from '@/shared/lib/notification';
import { isApiSuccess } from '@/shared/lib/api/result';
import { logger } from '@/shared/lib/logger';
import type { UserItem } from '@/features/admin/types/admin';

export default function UserListPage() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();

  const schDatas = useMemo(() => ({}), []);

  const searchParams = useMemo(() => {
    return searchDataExtraction(schDatas);
  }, [schDatas]);

  const { data: userList = [], isLoading, refetch: refetchUserList } = useUserList(searchParams);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<UserItem>>({});

  const saveMutation = useUserSave({
    onSuccess: (res) => {
      if (isApiSuccess(res)) {
        showToast.success('수정되었습니다.');
        setEditDialogOpen(false);
        setEditData({});
        refetchUserList();
      } else {
        showToast.error('수정에 실패했습니다.');
      }
    },
    onError: (error: unknown) => {
      logger.error('사용자 수정 실패', error, { context: 'UserListPage' });
      showToast.error('수정에 실패했습니다.');
    },
  });

  const handleEdit = (user: UserItem) => {
    setEditData({
      user_id: user.user_id,
      user_nm: user.user_nm || user.user_name || '',
      email: user.email || '',
      usg_yn: user.usg_yn || 'Y',
      del_yn: user.del_yn || 'N',
      lang_cd: user.lang_cd || 'ko',
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editData.user_id) {
      showToast.error('사용자 ID가 없습니다.');
      return;
    }

    const res = await confirm('수정하시겠습니까?');
    if (!res) return;

    saveMutation.mutate(editData);
  };

  const handleCloseDialog = () => {
    setEditDialogOpen(false);
    setEditData({});
  };

  const headers = useMemo(() => {
    const baseHeaders = [
      { title: '사용자 ID', key: 'user_id', align: 'center' as const },
      { title: '사용자명', key: 'user_nm', align: 'center' as const },
      { title: '이메일', key: 'email', align: 'left' as const },
      { title: '권한', key: 'roles', align: 'center' as const },
      { title: '사용여부', key: 'usg_yn', align: 'center' as const },
      { title: '삭제여부', key: 'del_yn', align: 'center' as const },
      { title: '언어 코드', key: 'lang_cd', align: 'center' as const },
      { title: '작업', key: 'action', align: 'center' as const },
    ];

    return baseHeaders.filter((col) => {
      if (mobile && ['lang_cd', 'roles', 'email'].includes(col.key)) return false;
      return true;
    });
  }, [mobile]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: { xs: 2, md: 4 } }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" onClick={() => router.push('/admin')} startIcon={<ArrowBackIcon />}>
            목록
          </Button>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700, fontSize: { xs: '20px', md: '24px' } }}>
            사용자 목록
          </Typography>
        </Box>

        <Card>
          <CardHeader title="사용자 목록" />
          <CardContent>
            <TableContainer>
              <Table size={mobile ? 'small' : 'medium'}>
                <TableHead>
                  <TableRow>
                    {headers.map((h) => (
                      <TableCell key={h.key} align={h.align}>
                        {h.title}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={headers.length} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : userList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={headers.length} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          데이터가 없습니다
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    userList.map((row, index) => (
                      <TableRow key={row.user_id || index} hover>
                        <TableCell align="center">{row.user_id}</TableCell>
                        <TableCell align="center">{row.user_nm}</TableCell>
                        {!mobile && (
                          <TableCell align="left">
                            <Typography variant="body2" color="text.secondary">
                              {row.email || '-'}
                            </Typography>
                          </TableCell>
                        )}
                        {!mobile && (
                          <TableCell align="center">
                            {row.roles && row.roles.length > 0 ? (
                              <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap" useFlexGap>
                                {row.roles.map((role, roleIndex) => (
                                  <Chip
                                    key={role.role_id || roleIndex}
                                    label={role.role_nm}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                  />
                                ))}
                              </Stack>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                -
                              </Typography>
                            )}
                          </TableCell>
                        )}
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            sx={{
                              color: row.usg_yn === 'Y' ? 'success.main' : 'text.secondary',
                              fontWeight: 600,
                            }}
                          >
                            {row.usg_yn}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            sx={{
                              color: row.del_yn === 'Y' ? 'error.main' : 'text.secondary',
                              fontWeight: 600,
                            }}
                          >
                            {row.del_yn}
                          </Typography>
                        </TableCell>
                        {!mobile && <TableCell align="center">{row.lang_cd}</TableCell>}
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(row)}
                            color="primary"
                            aria-label="수정"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* 수정 다이얼로그 */}
        <Dialog open={editDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth fullScreen={mobile}>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">사용자 정보 수정</Typography>
              <IconButton onClick={handleCloseDialog} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                fullWidth
                label="사용자 ID"
                value={editData.user_id || ''}
                disabled
                size="small"
              />
              <TextField
                fullWidth
                label="사용자명"
                value={editData.user_nm || ''}
                onChange={(e) => setEditData({ ...editData, user_nm: e.target.value })}
                size="small"
              />
              <TextField
                fullWidth
                label="이메일"
                type="email"
                value={editData.email || ''}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                size="small"
              />
              <FormControl fullWidth size="small">
                <InputLabel>사용여부</InputLabel>
                <Select
                  value={editData.usg_yn || 'Y'}
                  label="사용여부"
                  onChange={(e) => setEditData({ ...editData, usg_yn: e.target.value })}
                >
                  <MenuItem value="Y">사용</MenuItem>
                  <MenuItem value="N">미사용</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>삭제여부</InputLabel>
                <Select
                  value={editData.del_yn || 'N'}
                  label="삭제여부"
                  onChange={(e) => setEditData({ ...editData, del_yn: e.target.value })}
                >
                  <MenuItem value="N">정상</MenuItem>
                  <MenuItem value="Y">삭제</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>언어 코드</InputLabel>
                <Select
                  value={editData.lang_cd || 'ko'}
                  label="언어 코드"
                  onChange={(e) => setEditData({ ...editData, lang_cd: e.target.value })}
                >
                  <MenuItem value="ko">한국어</MenuItem>
                  <MenuItem value="en">영어</MenuItem>
                  <MenuItem value="ja">일본어</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>취소</Button>
            <Button onClick={handleSave} variant="contained" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
