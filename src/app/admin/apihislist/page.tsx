'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
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
import SearchIcon from '@mui/icons-material/Search';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApiHistoryList } from '@/features/admin/hooks';
import type { ApiHisItem } from '@/features/admin/types/admin';
import {
  buildApiHistoryRequestBody,
  DEFAULT_API_HISTORY_FILTERS,
  mergeApiHistoryFiltersFromUrl,
  type ApiHistoryFilterForm,
} from '@/features/admin/utils/apiHistorySearch';
import { formatDate } from '@/shared/utils/format';

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const METHOD_OPTIONS = ['', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

function rowVal(row: ApiHisItem, snake: keyof ApiHisItem, camel: string): string | number | undefined {
  const v = row[snake];
  if (v !== undefined && v !== null) return v as string | number;
  const alt = (row as Record<string, unknown>)[camel];
  if (alt === undefined || alt === null) return undefined;
  return typeof alt === 'string' || typeof alt === 'number' ? alt : String(alt);
}

function formatExeDtm(raw?: string): string {
  if (!raw) return '-';
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 14) {
    const iso = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}T${digits.slice(8, 10)}:${digits.slice(10, 12)}:${digits.slice(12, 14)}`;
    const formatted = formatDate(iso, 'YYYY-MM-DD HH:mm:ss');
    if (formatted) return formatted;
  }
  const formatted = formatDate(raw, 'YYYY-MM-DD HH:mm:ss');
  return formatted || raw;
}

export default function ApiHistoryPage() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<ApiHistoryFilterForm>(() =>
    mergeApiHistoryFiltersFromUrl(DEFAULT_API_HISTORY_FILTERS, searchParams)
  );
  const [appliedFilters, setAppliedFilters] = useState<ApiHistoryFilterForm>(() =>
    mergeApiHistoryFiltersFromUrl(DEFAULT_API_HISTORY_FILTERS, searchParams)
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const requestBody = useMemo(
    () => buildApiHistoryRequestBody(appliedFilters, page, pageSize),
    [appliedFilters, page, pageSize]
  );

  const { data: apiHistoryData, isLoading, isFetching, isError, error } = useApiHistoryList(requestBody, true);
  const apiHisList = apiHistoryData?.items ?? apiHistoryData?.list ?? [];
  const totalCount = apiHistoryData?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const incident = searchParams.get('incident');

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const showHttpStatus = apiHistoryData?.httpStatusEnabled === true;
  const showElapsedMs = apiHistoryData?.elapsedMsEnabled === true;
  const showTraceId = apiHistoryData?.traceIdEnabled === true;

  const headers = useMemo(() => {
    const baseHeaders = [
      { title: '사용자', key: 'user_id', align: 'center' as const },
      { title: 'ID', key: 'api_id', align: 'center' as const },
      { title: 'API URL', key: 'api_exe_url', align: 'left' as const },
      { title: '메서드', key: 'mthd_tp_cd', align: 'center' as const },
      { title: '날짜', key: 'exe_dtm', align: 'center' as const },
      ...(showHttpStatus ? [{ title: '상태', key: 'http_status', align: 'center' as const }] : []),
      ...(showElapsedMs ? [{ title: '응답시간', key: 'elapsed_ms', align: 'right' as const }] : []),
      ...(showTraceId ? [{ title: 'Trace ID', key: 'trace_id', align: 'left' as const }] : []),
      { title: 'IP address', key: 'ip_addr', align: 'center' as const },
    ];

    return baseHeaders.filter((col) => {
      if (mobile && ['api_id', 'api_exe_url', 'trace_id', 'ip_addr', 'mthd_tp_cd'].includes(col.key)) return false;
      return true;
    });
  }, [mobile, showHttpStatus, showElapsedMs, showTraceId]);

  const renderCell = useCallback((row: ApiHisItem, key: string) => {
    switch (key) {
      case 'user_id':
        return rowVal(row, 'user_id', 'userId') ?? rowVal(row, 'usr_id', 'usrId') ?? '-';
      case 'api_id':
        return rowVal(row, 'api_id', 'apiId') ?? '-';
      case 'api_exe_url':
        return rowVal(row, 'api_exe_url', 'apiExeUrl') ?? '-';
      case 'mthd_tp_cd':
        return rowVal(row, 'mthd_tp_cd', 'mthdTpCd') ?? '-';
      case 'exe_dtm':
        return formatExeDtm(String(rowVal(row, 'exe_dtm', 'exeDtm') ?? ''));
      case 'http_status': {
        const status = rowVal(row, 'http_status', 'httpStatus');
        return status != null ? String(status) : '-';
      }
      case 'elapsed_ms': {
        const ms = rowVal(row, 'elapsed_ms', 'elapsedMs');
        return ms != null ? `${ms}ms` : '-';
      }
      case 'trace_id':
        return String(rowVal(row, 'trace_id', 'traceId') ?? '-');
      case 'ip_addr':
        return rowVal(row, 'ip_addr', 'ipAddr') ?? '-';
      default:
        return '-';
    }
  }, []);

  const rowKey = useCallback((row: ApiHisItem, index: number) => {
    const trace = rowVal(row, 'trace_id', 'traceId');
    const sn = (row as Record<string, unknown>).api_exe_log_sn ?? (row as Record<string, unknown>).apiExeLogSn;
    if (trace != null && String(trace) !== '') return String(trace);
    if (sn != null) return String(sn);
    return `row-${index}`;
  }, []);

  const handleSearch = () => {
    setAppliedFilters({ ...filters });
    setPage(1);
  };

  const handleReset = () => {
    const initial = mergeApiHistoryFiltersFromUrl(DEFAULT_API_HISTORY_FILTERS, searchParams);
    setFilters(initial);
    setAppliedFilters(initial);
    setPage(1);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  const updateFilter = <K extends keyof ApiHistoryFilterForm>(key: K, value: ApiHistoryFilterForm[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const rangeLabel =
    totalCount === 0
      ? '0건'
      : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)} / ${totalCount}건`;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="outlined" onClick={() => router.push('/admin')} startIcon={<ArrowBackIcon />}>
            목록
          </Button>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700, fontSize: { xs: '20px', md: '24px' } }}>
              API 이력
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {rangeLabel}
              {apiHistoryData?.observabilityOnly ? ' · 상태·응답시간·Trace가 있는 로그만' : ''}
            </Typography>
          </Box>
          {incident && <Chip label={`incident: ${incident}`} color="warning" variant="outlined" />}
        </Box>

        <Card sx={{ mb: 3 }}>
          <CardHeader title="검색 조건" />
          <CardContent>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
                gap: 2,
              }}
            >
              <TextField
                size="small"
                label="사용자 ID"
                value={filters.user_id}
                onChange={(e) => updateFilter('user_id', e.target.value)}
              />
              <TextField
                size="small"
                label="API ID"
                value={filters.api_id}
                onChange={(e) => updateFilter('api_id', e.target.value)}
              />
              <TextField
                size="small"
                label="URL 키워드"
                value={filters.api_exe_url_keyword}
                onChange={(e) => updateFilter('api_exe_url_keyword', e.target.value)}
                placeholder="/api/..."
              />
              <FormControl size="small">
                <InputLabel id="api-his-mthd-label">메서드</InputLabel>
                <Select
                  labelId="api-his-mthd-label"
                  label="메서드"
                  value={filters.mthd_tp_cd}
                  onChange={(e) => updateFilter('mthd_tp_cd', e.target.value)}
                >
                  {METHOD_OPTIONS.map((m) => (
                    <MenuItem key={m || 'all'} value={m}>
                      {m || '전체'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small"
                label="IP"
                value={filters.ip_addr}
                onChange={(e) => updateFilter('ip_addr', e.target.value)}
              />
              {showTraceId && (
                <TextField
                  size="small"
                  label="Trace ID"
                  value={filters.trace_id}
                  onChange={(e) => updateFilter('trace_id', e.target.value)}
                />
              )}
              {showHttpStatus && (
                <TextField
                  size="small"
                  label="HTTP 상태"
                  type="number"
                  value={filters.http_status}
                  onChange={(e) => updateFilter('http_status', e.target.value)}
                  inputProps={{ min: 100, max: 599 }}
                />
              )}
              <TextField
                size="small"
                label="시작 일시"
                type="datetime-local"
                value={filters.start_exe_dtm}
                onChange={(e) => updateFilter('start_exe_dtm', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                size="small"
                label="종료 일시"
                type="datetime-local"
                value={filters.end_exe_dtm}
                onChange={(e) => updateFilter('end_exe_dtm', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              {showElapsedMs && (
                <>
                  <TextField
                    size="small"
                    label="최소 응답(ms)"
                    type="number"
                    value={filters.min_elapsed_ms}
                    onChange={(e) => updateFilter('min_elapsed_ms', e.target.value)}
                    inputProps={{ min: 0 }}
                  />
                  <TextField
                    size="small"
                    label="최대 응답(ms)"
                    type="number"
                    value={filters.max_elapsed_ms}
                    onChange={(e) => updateFilter('max_elapsed_ms', e.target.value)}
                    inputProps={{ min: 0 }}
                  />
                </>
              )}
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
              {showHttpStatus && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={filters.error_only}
                      onChange={(e) => updateFilter('error_only', e.target.checked)}
                    />
                  }
                  label="에러만 (4xx/5xx)"
                />
              )}
              {showElapsedMs && (
                <>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={filters.slow_only}
                        onChange={(e) => updateFilter('slow_only', e.target.checked)}
                      />
                    }
                    label="슬로우만"
                  />
                  {filters.slow_only && (
                    <TextField
                      size="small"
                      label="슬로우 기준(ms)"
                      type="number"
                      value={filters.slow_threshold_ms}
                      onChange={(e) => updateFilter('slow_threshold_ms', e.target.value)}
                      sx={{ width: 140 }}
                      inputProps={{ min: 1 }}
                    />
                  )}
                </>
              )}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.observability_only}
                    onChange={(e) => updateFilter('observability_only', e.target.checked)}
                  />
                }
                label="관측값 있는 로그만"
              />
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button variant="contained" startIcon={<SearchIcon />} onClick={handleSearch}>
                검색
              </Button>
              <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={handleReset}>
                초기화
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="API 이력 목록"
            action={
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel id="api-his-page-size">페이지당</InputLabel>
                <Select
                  labelId="api-his-page-size"
                  label="페이지당"
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <MenuItem key={n} value={n}>
                      {n}건
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            }
          />
          <CardContent>
            {isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                API 이력을 불러올 수 없습니다. {error instanceof Error ? error.message : '알 수 없는 오류'}
              </Alert>
            )}
            <Box sx={{ position: 'relative' }}>
              {(isLoading || isFetching) && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(255,255,255,0.6)',
                    zIndex: 1,
                  }}
                >
                  <CircularProgress size={32} aria-label="API 이력 로딩" />
                </Box>
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
                        <TableRow key={rowKey(row, index)} hover>
                          {headers.map((h) => (
                            <TableCell key={h.key} align={h.align}>
                              {renderCell(row, h.key)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={Math.min(page, totalPages)}
                  onChange={handlePageChange}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
