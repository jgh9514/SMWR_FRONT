'use client';

import { useMemo } from 'react';
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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';
import { searchDataExtraction } from '@/shared/utils/util';
import type { LoginHisItem } from '@/types';
import { useLoginHistoryList } from '@/features/admin/hooks';

export default function LoginHistoryPage() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();

  const schDatas = useMemo(() => ({}), []);

  const searchParams = useMemo(() => {
    return searchDataExtraction(schDatas);
  }, [schDatas]);

  const { data: loginHisList = [] } = useLoginHistoryList(searchParams, false);

  const headers = useMemo(() => {
    const baseHeaders = [
      { title: '사용자 ID', key: 'usr_id', align: 'center' as const },
      { title: '사용자명', key: 'usr_nm', align: 'center' as const },
      { title: '날짜/시간', key: 'login_dtm', align: 'center' as const },
      { title: 'IP address', key: 'ip_addr', align: 'center' as const },
      { title: '보유 권한', key: 'role_list', align: 'left' as const },
    ];

    return baseHeaders.filter((col) => {
      if (mobile && ['ip_addr', 'role_list'].includes(col.key)) return false;
      return true;
    });
  }, [mobile]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" onClick={() => router.push('/admin')} startIcon={<ArrowBackIcon />}>
            목록
          </Button>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700, fontSize: { xs: '20px', md: '24px' } }}>
            로그인 이력
          </Typography>
        </Box>

        <Card>
          <CardHeader title="로그인 이력 목록" />
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
                  {loginHisList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={headers.length} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          데이터가 없습니다
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    loginHisList.map((row, index) => (
                      <TableRow key={row.usr_id || index} hover>
                        <TableCell align="center">{row.usr_id}</TableCell>
                        <TableCell align="center">{row.usr_nm}</TableCell>
                        <TableCell align="center">{row.login_dtm}</TableCell>
                        {!mobile && <TableCell align="center">{row.ip_addr}</TableCell>}
                        {!mobile && <TableCell align="left">{row.role_list}</TableCell>}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
