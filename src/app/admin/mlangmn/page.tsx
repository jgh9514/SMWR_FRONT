'use client';

import { useMemo, useState } from 'react';
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
import { searchDataExtraction } from '@/shared/utils/util';
import { showToast } from '@/shared/lib/notification';
import { useMlangList } from '@/features/admin/hooks';
import type { SearchData } from '@/shared/types/util';

export default function MultiLanguageManagementPage() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();

  const [schDatas] = useState<SearchData>({});
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const headers = useMemo(() => {
    const cols = [
      { title: 'MLANG_ID', key: 'mlang_id', align: 'center' as const },
      { title: '다국어 유형', key: 'mlang_tp_cd', align: 'center' as const },
      { title: '업무구분', key: 'bsns_cd', align: 'center' as const },
      { title: '언어', key: 'lang_cd', align: 'center' as const },
      { title: '라벨/메시지', key: 'mlang_txt', align: 'left' as const },
      { title: '등록자', key: 'usr_nm', align: 'center' as const },
      { title: '등록일', key: 'upt_dt', align: 'center' as const },
    ];

    if (mobile) {
      return cols.filter((col) => !['mlang_tp_cd', 'bsns_cd', 'usr_nm', 'upt_dt'].includes(col.key));
    }
    return cols;
  }, [mobile]);

  const searchParams = useMemo(() => {
    return searchDataExtraction(schDatas);
  }, [schDatas]);

  const { data: mlangList = [] } = useMlangList(searchParams);

  const handleAdd = () => {
    showToast.info('개발 중입니다.');
  };

  const handleDelete = async () => {
    if (selectedItems.length === 0) {
      showToast.error('삭제할 데이터가 없습니다.');
      return;
    }
    showToast.info('개발 중입니다.');
  };

  const handleSave = async () => {
    showToast.info('개발 중입니다.');
  };

  const toggleSelectItem = (mlangId: string) => {
    setSelectedItems((prev) =>
      prev.includes(mlangId) ? prev.filter((v) => v !== mlangId) : [...prev, mlangId],
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" onClick={() => router.push('/admin')} startIcon={<ArrowBackIcon />}>
            목록
          </Button>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700, fontSize: { xs: '20px', md: '24px' } }}>
            다국어 관리
          </Typography>
        </Box>

        <Card>
          <CardHeader
            title="다국어 목록"
            action={
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button size="small" variant="contained" color="primary" onClick={handleAdd}>
                  추가
                </Button>
                <Button size="small" variant="contained" color="error" onClick={handleDelete}>
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
                    {headers.map((h) => (
                      <TableCell key={h.key} align={h.align}>
                        {h.title}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mlangList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={headers.length + 1} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          데이터가 없습니다
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    mlangList.map((row) => {
                      const mlangId = row.mlang_id || '';
                      const isSelected = selectedItems.includes(mlangId);
                      return (
                        <TableRow key={mlangId} hover selected={isSelected}>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggleSelectItem(mlangId)}
                            />
                          </TableCell>
                          <TableCell align="center">{mlangId}</TableCell>
                          {!mobile && <TableCell align="center">{row.mlang_tp_cd}</TableCell>}
                          {!mobile && <TableCell align="center">{row.bsns_cd}</TableCell>}
                          <TableCell align="center">{row.lang_cd}</TableCell>
                          <TableCell align="left">{row.mlang_txt}</TableCell>
                          {!mobile && <TableCell align="center">{row.usr_nm}</TableCell>}
                          {!mobile && <TableCell align="center">{row.upt_dt}</TableCell>}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" color="primary" onClick={handleSave}>
            저장
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
