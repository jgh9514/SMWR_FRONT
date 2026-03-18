'use client';

import { useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
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
import { useRouter, useSearchParams } from 'next/navigation';
import { useApiHistoryList } from '@/features/admin/hooks';

export default function ApiHistoryPage() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestBody = useMemo(() => {
    const incident = searchParams.get('incident') || undefined;
    const errorOnly = searchParams.get('error_only');
    const slowOnly = searchParams.get('slow_only');
    const slowThresholdMs = searchParams.get('slow_threshold_ms');

    return {
      limit: 100,
      offset: 0,
      incident,
      error_only: errorOnly === 'true' ? true : undefined,
      slow_only: slowOnly === 'true' ? true : undefined,
      slow_threshold_ms: slowThresholdMs ? Number(slowThresholdMs) : undefined,
    };
  }, [searchParams]);

  const { data: apiHistoryData, isLoading, isError, error } = useApiHistoryList(requestBody, true);
  const apiHisList = apiHistoryData?.items ?? apiHistoryData?.list ?? [];
  const incident = searchParams.get('incident');

  const headers = useMemo(() => {
    const baseHeaders = [
      { title: '사용자', key: 'user_id', align: 'center' as const },
      { title: 'ID', key: 'api_id', align: 'center' as const },
      { title: 'API URL', key: 'api_exe_url', align: 'left' as const },
      { title: '메서드', key: 'mthd_tp_cd', align: 'center' as const },
      { title: '날짜', key: 'exe_dtm', align: 'center' as const },
      { title: '상태', key: 'http_status', align: 'center' as const },
      { title: '응답시간', key: 'elapsed_ms', align: 'right' as const },
      { title: 'Trace ID', key: 'trace_id', align: 'left' as const },
      { title: 'IP address', key: 'ip_addr', align: 'center' as const },
    ];

    return baseHeaders.filter((col) => {
      if (mobile && ['api_id', 'api_exe_url', 'trace_id', 'ip_addr', 'mthd_tp_cd'].includes(col.key)) return false;
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
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700, fontSize: { xs: '20px', md: '24px' } }}>
              API 이력
            </Typography>
            <Typography variant="body2" color="text.secondary">
              총 {apiHistoryData?.totalCount ?? apiHisList.length}건
            </Typography>
          </Box>
          {incident && <Chip label={`incident: ${incident}`} color="warning" variant="outlined" />}
        </Box>

        <Card>
          <CardHeader title="API 이력 목록" />
          <CardContent>
            {isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                API 이력을 불러올 수 없습니다. {error instanceof Error ? error.message : '알 수 없는 오류'}
              </Alert>
            )}
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
                  {!isLoading && apiHisList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={headers.length} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          데이터가 없습니다
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    apiHisList.map((row, index) => (
                      <TableRow key={row.trace_id || row.user_id || index} hover>
                        <TableCell align="center">{row.user_id || row.usr_id || '-'}</TableCell>
                        {!mobile && <TableCell align="center">{row.api_id}</TableCell>}
                        {!mobile && <TableCell align="left">{row.api_exe_url}</TableCell>}
                        {!mobile && <TableCell align="center">{row.mthd_tp_cd || '-'}</TableCell>}
                        <TableCell align="center">{row.exe_dtm}</TableCell>
                        <TableCell align="center">{row.http_status ?? '-'}</TableCell>
                        <TableCell align="right">{row.elapsed_ms != null ? `${row.elapsed_ms}ms` : '-'}</TableCell>
                        {!mobile && <TableCell align="left">{row.trace_id || '-'}</TableCell>}
                        {!mobile && <TableCell align="center">{row.ip_addr}</TableCell>}
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
