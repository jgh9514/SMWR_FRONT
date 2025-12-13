'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Grid,
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
import { useMonsterList, useMonsterDetail, useMonsterUpdate, type MonsterItem } from '@/features/admin/hooks/useMonster';
import { searchDataExtraction } from '@/shared/utils/util';
import { showToast, confirm } from '@/shared/lib/notification';
import { logger } from '@/shared/lib/logger';

export default function MonsterManagementPage() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();

  const [schDatas, setSchDatas] = useState<any>({
    monster_id: '',
    kr_name: '',
    un_name: '',
    monster_elemental: '',
    star: '',
    arousal_type: '',
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMonster, setSelectedMonster] = useState<MonsterItem | null>(null);
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
      setSelectedMonster(null);
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
      { title: '몬스터 ID', key: 'monster_id', align: 'center' as const },
      { title: '한글명', key: 'kr_name', align: 'left' as const },
      { title: '영문명', key: 'un_name', align: 'left' as const },
      { title: '속성', key: 'monster_elemental', align: 'center' as const },
      { title: '별', key: 'star', align: 'center' as const },
      { title: '각성', key: 'arousal_type', align: 'center' as const },
      { title: '작업', key: 'action', align: 'center' as const },
    ];

    if (mobile) {
      return baseHeaders.filter((col) => !['un_name', 'arousal_type'].includes(col.key));
    }
    return baseHeaders;
  }, [mobile]);

  const handleSearch = () => {
    setPage(1);
    refetchMonsterList();
  };

  const handleReset = () => {
    setSchDatas({
      monster_id: '',
      kr_name: '',
      un_name: '',
      monster_elemental: '',
      star: '',
      arousal_type: '',
    });
    setPage(1);
  };

  const handleEdit = (monster: MonsterItem) => {
    setSelectedMonster(monster);
    setEditData({
      monster_id: monster.monster_id,
      kr_name: monster.kr_name,
      un_name: monster.un_name,
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
    setSelectedMonster(null);
    setEditData({});
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  useEffect(() => {
    refetchMonsterList();
  }, [page]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 4 } }}>
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
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={2} {...({} as any)}>
                <TextField
                  fullWidth
                  label="몬스터 ID"
                  value={schDatas.monster_id}
                  onChange={(e) => setSchDatas({ ...schDatas, monster_id: e.target.value })}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2} {...({} as any)}>
                <TextField
                  fullWidth
                  label="한글명"
                  value={schDatas.kr_name}
                  onChange={(e) => setSchDatas({ ...schDatas, kr_name: e.target.value })}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2} {...({} as any)}>
                <TextField
                  fullWidth
                  label="영문명"
                  value={schDatas.un_name}
                  onChange={(e) => setSchDatas({ ...schDatas, un_name: e.target.value })}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2} {...({} as any)}>
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
              </Grid>
              <Grid item xs={12} sm={6} md={2} {...({} as any)}>
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
              </Grid>
              <Grid item xs={12} sm={6} md={2} {...({} as any)}>
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
              </Grid>
              <Grid item xs={12} {...({} as any)} sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button variant="contained" onClick={handleSearch} startIcon={<SearchIcon />}>
                  검색
                </Button>
                <Button variant="outlined" onClick={handleReset}>
                  초기화
                </Button>
              </Grid>
            </Grid>
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
                        <TableCell align="center">{row.monster_id}</TableCell>
                        <TableCell align="left">{row.kr_name}</TableCell>
                        {!mobile && <TableCell align="left">{row.un_name}</TableCell>}
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
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6} {...({} as any)}>
                <TextField
                  fullWidth
                  label="몬스터 ID"
                  value={editData.monster_id || ''}
                  disabled
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} {...({} as any)}>
                <TextField
                  fullWidth
                  label="한글명"
                  value={editData.kr_name || ''}
                  onChange={(e) => setEditData({ ...editData, kr_name: e.target.value })}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} {...({} as any)}>
                <TextField
                  fullWidth
                  label="영문명"
                  value={editData.un_name || ''}
                  onChange={(e) => setEditData({ ...editData, un_name: e.target.value })}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} {...({} as any)}>
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
              </Grid>
              <Grid item xs={12} sm={6} {...({} as any)}>
                <TextField
                  fullWidth
                  label="별"
                  type="number"
                  value={editData.star || ''}
                  onChange={(e) => setEditData({ ...editData, star: parseInt(e.target.value) || 0 })}
                  size="small"
                  inputProps={{ min: 1, max: 6 }}
                />
              </Grid>
              <Grid item xs={12} sm={6} {...({} as any)}>
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
              </Grid>
              <Grid item xs={12} sm={6} {...({} as any)}>
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
              </Grid>
              <Grid item xs={12} sm={6} {...({} as any)}>
                <TextField
                  fullWidth
                  label="이미지 URL"
                  value={editData.image_url || ''}
                  onChange={(e) => setEditData({ ...editData, image_url: e.target.value })}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} {...({} as any)}>
                <TextField
                  fullWidth
                  label="리더 ID"
                  value={editData.leader_id || ''}
                  onChange={(e) => setEditData({ ...editData, leader_id: e.target.value })}
                  size="small"
                />
              </Grid>
            </Grid>
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
