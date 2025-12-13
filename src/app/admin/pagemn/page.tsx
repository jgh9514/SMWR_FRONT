'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';
import { usePageList, usePageConditionList } from '@/hooks/api';
import { searchDataExtraction } from '@/shared/utils/util';
import { useCommonCodes } from '@/features/admin/hooks/useCommonCode';
import { showToast } from '@/shared/lib/notification';
import type { PageItem, ConditionItem } from '@/types';

export default function PageManagementPage() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();

  const [schDatas, setSchDatas] = useState<any>({});
  const [conditionList, setConditionList] = useState<ConditionItem[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const pageHeaders = useMemo(() => {
    const cols = [
      { title: '화면 ID', key: 'page_id', align: 'center' as const },
      { title: '화면명', key: 'page_nm', align: 'left' as const },
      { title: '화면 URL', key: 'page_url', align: 'left' as const },
    ];

    if (mobile) {
      return cols.filter((col) => col.key !== 'page_url');
    }
    return cols;
  }, [mobile]);

  const conditionHeaders = useMemo(() => {
    const cols = [
      { title: '조건 ID', key: 'cond_id', align: 'center' as const },
      { title: '조건명', key: 'cond_nm', align: 'left' as const },
      { title: '조건 타입', key: 'cond_tp_cd', align: 'center' as const },
      { title: '필수여부', key: 'mdat_yn', align: 'center' as const },
    ];

    if (mobile) {
      return cols.filter((col) => !['cond_id', 'cond_tp_cd'].includes(col.key));
    }
    return cols;
  }, [mobile]);

  const searchParams = useMemo(() => {
    return searchDataExtraction(schDatas);
  }, [schDatas]);

  const { data: pageList = [], refetch: refetchPage } = usePageList(searchParams);
  const { data: conditionResponse = [], refetch: refetchCondition } = usePageConditionList(selectedPageId);

  useEffect(() => {
    if (conditionResponse.length > 0) {
      setConditionList(
        conditionResponse.map((row: any, idx: number) => ({
          ...row,
          id: `${row.page_id}_${row.cond_id}_${idx}`,
        })),
      );
    } else {
      setConditionList([]);
    }
  }, [conditionResponse]);

  const handlePageClick = (item: PageItem) => {
    setSelectedPageId(item.page_id);
  };

  const handleAddGrp = () => {
    showToast.info('개발 중입니다.');
  };

  const handleDeleteGrp = async () => {
    if (selectedPages.length === 0) {
      showToast.error('삭제할 데이터가 없습니다.');
      return;
    }
    showToast.info('개발 중입니다.');
  };

  const handleAddCondition = () => {
    if (!selectedPageId) {
      showToast.error('화면을 먼저 선택해주세요.');
      return;
    }
    showToast.info('개발 중입니다.');
  };

  const handleDeleteCondition = async () => {
    if (selectedConditions.length === 0) {
      showToast.error('삭제할 데이터가 없습니다.');
      return;
    }
    showToast.info('개발 중입니다.');
  };

  const handleSave = async () => {
    showToast.info('개발 중입니다.');
  };

  const toggleSelectPage = (pageId: string) => {
    setSelectedPages((prev) =>
      prev.includes(pageId) ? prev.filter((v) => v !== pageId) : [...prev, pageId],
    );
  };

  const toggleSelectCondition = (id: string) => {
    setSelectedConditions((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  const initialCodeGroups = {
    CO00000004: {
      cd: [],
      cd_nm: [],
    },
    CO00000005: {
      cd: [],
      cd_nm: [],
    },
  };
  useCommonCodes(initialCodeGroups);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" onClick={() => router.push('/admin')} startIcon={<ArrowBackIcon />}>
            목록
          </Button>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700, fontSize: { xs: '20px', md: '24px' } }}>
            페이지 관리
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          {/* 화면 목록 */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 8px)' } }}>
            <Card>
              <CardHeader
                title="화면 목록"
                action={
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button size="small" variant="contained" color="primary" onClick={handleAddGrp}>
                      추가
                    </Button>
                    <Button size="small" variant="contained" color="error" onClick={handleDeleteGrp}>
                      삭제
                    </Button>
                  </Box>
                }
              />
              <CardContent>
                <TableContainer>
                  <Table size={mobile ? 'small' : 'medium'}>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox" />
                        {pageHeaders.map((h) => (
                          <TableCell key={h.key} align={h.align}>
                            {h.title}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pageList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={pageHeaders.length + 1} align="center" sx={{ py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              데이터가 없습니다
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        pageList.map((row) => {
                          const isSelected = selectedPages.includes(row.page_id);
                          return (
                            <TableRow
                              key={row.page_id}
                              onClick={() => handlePageClick(row)}
                              sx={{ cursor: 'pointer' }}
                              hover
                              selected={selectedPageId === row.page_id}
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={isSelected}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelectPage(row.page_id);
                                  }}
                                />
                              </TableCell>
                              <TableCell align="center">{row.page_id}</TableCell>
                              <TableCell align="left">{row.page_nm}</TableCell>
                              {!mobile && <TableCell align="left">{row.page_url}</TableCell>}
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>

          {/* 검색조건 목록 */}
          <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 8px)' } }}>
            <Card>
              <CardHeader
                title="검색조건 목록"
                action={
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      onClick={handleAddCondition}
                      disabled={!selectedPageId}
                    >
                      추가
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="error"
                      onClick={handleDeleteCondition}
                      disabled={!selectedPageId}
                    >
                      삭제
                    </Button>
                  </Box>
                }
              />
              <CardContent>
                {selectedPageId ? (
                  <TableContainer>
                    <Table size={mobile ? 'small' : 'medium'}>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox" />
                          {conditionHeaders.map((h) => (
                            <TableCell key={h.key} align={h.align}>
                              {h.title}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {conditionList.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={conditionHeaders.length + 1} align="center" sx={{ py: 4 }}>
                              <Typography variant="body2" color="text.secondary">
                                데이터가 없습니다
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          conditionList.map((row) => {
                            const isSelected = selectedConditions.includes(row.id);
                            return (
                              <TableRow key={row.id} hover>
                                <TableCell padding="checkbox">
                                  <Checkbox
                                    checked={isSelected}
                                    onChange={() => toggleSelectCondition(row.id)}
                                  />
                                </TableCell>
                                {!mobile && <TableCell align="center">{row.cond_id}</TableCell>}
                                <TableCell align="left">{row.cond_nm}</TableCell>
                                {!mobile && <TableCell align="center">{row.cond_tp_cd}</TableCell>}
                                <TableCell align="center">
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      color: row.mdat_yn === 'Y' ? 'error.main' : 'text.secondary',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {row.mdat_yn}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      화면을 선택해주세요
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
