'use client';

import { useMemo, useState } from 'react';
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
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { useRouter } from 'next/navigation';
import { useMonsterList, useMonsterUpdate, type MonsterItem } from '@/features/admin/hooks/useMonster';
import { searchDataExtraction } from '@/shared/utils/util';
import { showToast, confirm } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';
import { getMonsterImageUrl } from '@/shared/utils/image';
import { Avatar } from '@mui/material';
import type { SearchData } from '@/shared/types/util';

export default function MonsterManagementPage() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();

  const [schDatas, setSchDatas] = useState<SearchData>({
    monster_id: '',
    kr_name: '',
    un_name: '',
    un_name_status: '',
    usg_yn: 'Y',
    monster_elemental: '',
    star: '',
    arousal_type: '',
    orderBy: 'monster_id',
    orderDir: 'asc',
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<MonsterItem>>({});

  const searchParams = useMemo(() => {
    const params = searchDataExtraction(schDatas);
    params.page = page;
    params.limit = limit;
    return params;
  }, [schDatas, page, limit]);

  const { data: monsterListResponse, refetch: refetchMonsterList, isLoading } = useMonsterList(searchParams);
  const monsterList = monsterListResponse?.list || [];
  const totalCount = monsterListResponse?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const updateMutation = useMonsterUpdate({
    onSuccess: () => {
      showToast.success('수정되었습니다.');
      setEditDialogOpen(false);
      setEditData({});
      refetchMonsterList();
    },
    onError: (error: unknown) => {
      logger.error('몬스터 수정 실패', error, { context: 'MonsterManagementPage' });
      showToast.error('수정에 실패했습니다.');
    },
  });

  const headers = useMemo(() => {
    const baseHeaders = [
      { title: '이미지', key: 'image', align: 'center' as const },
      { title: '몬스터 ID', key: 'monster_id', align: 'center' as const },
      { title: '한글명', key: 'kr_name', align: 'left' as const },
      { title: '영문명', key: 'un_name', align: 'left' as const },
      { title: '구분', key: 'un_name_status', align: 'center' as const },
      { title: '속성', key: 'monster_elemental', align: 'center' as const },
      { title: '별', key: 'star', align: 'center' as const },
      { title: '각성', key: 'arousal_type', align: 'center' as const },
      { title: '작업', key: 'action', align: 'center' as const },
    ];

    if (mobile) {
      return baseHeaders.filter((col) => !['un_name', 'un_name_status', 'arousal_type'].includes(col.key));
    }
    return baseHeaders;
  }, [mobile]);

  const getUnNameStatusLabel = (status?: string) => {
    switch (status) {
      case 'VERIFIED':
        return '검증완료';
      case 'BATCH':
        return '갱신필요';
      default:
        return status || '-';
    }
  };

  const handleSearch = () => {
    setPage(1);
    refetchMonsterList();
  };

  const handleReset = () => {
    setSchDatas({
      monster_id: '',
      kr_name: '',
      un_name: '',
      un_name_status: '',
      usg_yn: 'Y',
      monster_elemental: '',
      star: '',
      arousal_type: '',
      orderBy: 'monster_id',
      orderDir: 'asc',
    });
    setPage(1);
  };

  const handleEdit = (monster: MonsterItem) => {
    setEditData({
      monster_id: monster.monster_id,
      kr_name: monster.kr_name,
      un_name: monster.un_name,
      un_name_status: monster.un_name_status || 'BATCH',
      usg_yn: monster.usg_yn || 'Y',
      monster_elemental: monster.monster_elemental,
      star: monster.star,
      star_type: monster.star_type,
      arousal_type: monster.arousal_type,
      image_url: monster.image_url,
      leader_id: monster.leader_id || '',
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editData.monster_id) {
      showToast.error('몬스터 ID가 없습니다.');
      return;
    }

    const res = await confirm('수정하시겠습니까?');
    if (!res) return;

    updateMutation.mutate(editData);
  };

  const handleCloseDialog = () => {
    setEditDialogOpen(false);
    setEditData({});
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: { xs: 2, md: 4 } }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" onClick={() => router.push('/admin')} startIcon={<ArrowBackIcon />}>
            목록
          </Button>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700, fontSize: { xs: '20px', md: '24px' } }}>
            몬스터 관리
          </Typography>
        </Box>

        {/* 검색 영역 */}
        <Card sx={{ mb: 3 }}>
          <CardHeader title="검색 조건" />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                <TextField
                  fullWidth
                  label="몬스터 ID"
                  value={schDatas.monster_id}
                  onChange={(e) => setSchDatas({ ...schDatas, monster_id: e.target.value })}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="한글명"
                  value={schDatas.kr_name}
                  onChange={(e) => setSchDatas({ ...schDatas, kr_name: e.target.value })}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="영문명"
                  value={schDatas.un_name}
                  onChange={(e) => setSchDatas({ ...schDatas, un_name: e.target.value })}
                  size="small"
                />
                <FormControl fullWidth size="small">
                  <InputLabel>속성</InputLabel>
                  <Select
                    value={schDatas.monster_elemental}
                    label="속성"
                    onChange={(e) => setSchDatas({ ...schDatas, monster_elemental: e.target.value })}
                  >
                    <MenuItem value="">전체</MenuItem>
                    <MenuItem value="Fire">Fire</MenuItem>
                    <MenuItem value="Water">Water</MenuItem>
                    <MenuItem value="Wind">Wind</MenuItem>
                    <MenuItem value="Light">Light</MenuItem>
                    <MenuItem value="Dark">Dark</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>별</InputLabel>
                  <Select
                    value={schDatas.star}
                    label="별"
                    onChange={(e) => setSchDatas({ ...schDatas, star: e.target.value })}
                  >
                    <MenuItem value="">전체</MenuItem>
                    <MenuItem value="3">3</MenuItem>
                    <MenuItem value="4">4</MenuItem>
                    <MenuItem value="5">5</MenuItem>
                    <MenuItem value="6">6</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>각성</InputLabel>
                  <Select
                    value={schDatas.arousal_type}
                    label="각성"
                    onChange={(e) => setSchDatas({ ...schDatas, arousal_type: e.target.value })}
                  >
                    <MenuItem value="">전체</MenuItem>
                    <MenuItem value="Normal">Normal</MenuItem>
                    <MenuItem value="Awakened">Awakened</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>영문명 구분</InputLabel>
                  <Select
                    value={schDatas.un_name_status}
                    label="영문명 구분"
                    onChange={(e) => setSchDatas({ ...schDatas, un_name_status: e.target.value })}
                  >
                    <MenuItem value="">전체</MenuItem>
                    <MenuItem value="BATCH">갱신필요</MenuItem>
                    <MenuItem value="VERIFIED">검증완료</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>사용여부</InputLabel>
                  <Select
                    value={schDatas.usg_yn ?? 'Y'}
                    label="사용여부"
                    onChange={(e) => setSchDatas({ ...schDatas, usg_yn: e.target.value })}
                  >
                    <MenuItem value="">전체</MenuItem>
                    <MenuItem value="Y">사용</MenuItem>
                    <MenuItem value="N">미사용</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel>정렬 기준</InputLabel>
                  <Select
                    value={schDatas.orderBy}
                    label="정렬 기준"
                    onChange={(e) => {
                      setSchDatas({ ...schDatas, orderBy: e.target.value });
                      setPage(1);
                    }}
                  >
                    <MenuItem value="monster_id">몬스터 ID</MenuItem>
                    <MenuItem value="kr_name">한글명</MenuItem>
                    <MenuItem value="star">별</MenuItem>
                    <MenuItem value="crt_date">등록일</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel>정렬 방향</InputLabel>
                  <Select
                    value={schDatas.orderDir}
                    label="정렬 방향"
                    onChange={(e) => {
                      setSchDatas({ ...schDatas, orderDir: e.target.value });
                      setPage(1);
                    }}
                  >
                    <MenuItem value="asc">오름차순</MenuItem>
                    <MenuItem value="desc">내림차순</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button variant="contained" onClick={handleSearch} startIcon={<SearchIcon />}>
                  검색
                </Button>
                <Button variant="outlined" onClick={handleReset}>
                  초기화
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* 목록 영역 */}
        <Card>
          <CardHeader
            title={`몬스터 목록 (총 ${totalCount}개)`}
            action={
              <Typography variant="body2" color="text.secondary">
                {page} / {totalPages} 페이지
              </Typography>
            }
          />
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
                        <Typography variant="body2" color="text.secondary">
                          로딩 중...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : monsterList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={headers.length} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          데이터가 없습니다
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    monsterList.map((row, index) => (
                      <TableRow key={row.monster_id || index} hover>
                        <TableCell align="center">
                          {row.image_url ? (
                            <Avatar
                              src={getMonsterImageUrl(row.image_url)}
                              alt={row.kr_name}
                              sx={{ width: 48, height: 48, mx: 'auto' }}
                            />
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell align="center">{row.monster_id}</TableCell>
                        <TableCell align="left">{row.kr_name}</TableCell>
                        {!mobile && <TableCell align="left">{row.un_name}</TableCell>}
                        {!mobile && (
                          <TableCell align="center">
                            <Typography
                              variant="body2"
                              sx={{
                                color: row.un_name_status === 'BATCH' ? 'warning.main' : 'success.main',
                                fontWeight: row.un_name_status === 'BATCH' ? 600 : 400,
                              }}
                            >
                              {getUnNameStatusLabel(row.un_name_status)}
                            </Typography>
                          </TableCell>
                        )}
                        <TableCell align="center">{row.monster_elemental}</TableCell>
                        <TableCell align="center">{row.star}</TableCell>
                        {!mobile && <TableCell align="center">{row.arousal_type}</TableCell>}
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
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" />
              </Box>
            )}
          </CardContent>
        </Card>

        {/* 수정 다이얼로그 */}
        <Dialog open={editDialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">몬스터 정보 수정</Typography>
              <IconButton onClick={handleCloseDialog} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mt: 1 }}>
              <TextField
                fullWidth
                label="몬스터 ID"
                value={editData.monster_id || ''}
                disabled
                size="small"
              />
              <TextField
                fullWidth
                label="한글명"
                value={editData.kr_name || ''}
                onChange={(e) => setEditData({ ...editData, kr_name: e.target.value })}
                size="small"
              />
              <TextField
                fullWidth
                label="영문명"
                value={editData.un_name || ''}
                onChange={(e) => setEditData({ ...editData, un_name: e.target.value })}
                size="small"
              />
              <FormControl fullWidth size="small">
                <InputLabel>영문명 구분</InputLabel>
                <Select
                  value={editData.un_name_status || 'BATCH'}
                  label="영문명 구분"
                  onChange={(e) => setEditData({ ...editData, un_name_status: e.target.value })}
                >
                  <MenuItem value="BATCH">갱신필요</MenuItem>
                  <MenuItem value="VERIFIED">검증완료</MenuItem>
                </Select>
              </FormControl>
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
                <InputLabel>속성</InputLabel>
                <Select
                  value={editData.monster_elemental || ''}
                  label="속성"
                  onChange={(e) => setEditData({ ...editData, monster_elemental: e.target.value })}
                >
                  <MenuItem value="Fire">Fire</MenuItem>
                  <MenuItem value="Water">Water</MenuItem>
                  <MenuItem value="Wind">Wind</MenuItem>
                  <MenuItem value="Light">Light</MenuItem>
                  <MenuItem value="Dark">Dark</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="별"
                type="number"
                value={editData.star || ''}
                onChange={(e) => setEditData({ ...editData, star: parseInt(e.target.value) || 0 })}
                size="small"
                inputProps={{ min: 1, max: 6 }}
              />
              <FormControl fullWidth size="small">
                <InputLabel>별 타입</InputLabel>
                <Select
                  value={editData.star_type || ''}
                  label="별 타입"
                  onChange={(e) => setEditData({ ...editData, star_type: e.target.value })}
                >
                  <MenuItem value="Normal">Normal</MenuItem>
                  <MenuItem value="Special">Special</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>각성</InputLabel>
                <Select
                  value={editData.arousal_type || ''}
                  label="각성"
                  onChange={(e) => setEditData({ ...editData, arousal_type: e.target.value })}
                >
                  <MenuItem value="Normal">Normal</MenuItem>
                  <MenuItem value="Awakened">Awakened</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="이미지 URL"
                value={editData.image_url || ''}
                onChange={(e) => setEditData({ ...editData, image_url: e.target.value })}
                size="small"
              />
              <TextField
                fullWidth
                label="리더 ID"
                value={editData.leader_id || ''}
                onChange={(e) => setEditData({ ...editData, leader_id: e.target.value })}
                size="small"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>취소</Button>
            <Button onClick={handleSave} variant="contained" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
