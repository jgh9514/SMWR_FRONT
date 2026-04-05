'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  Container,
  Pagination,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { PageBanner, PageHeader } from '@/shared/ui';
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/validation';
import { useGuildRecruitmentList } from '@/features/guild-recruitment/hooks/useGuildRecruitment';
import { isAuthenticated } from '@/shared/utils/auth';

function formatPostedAt(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ko-KR');
}

export default function GuildRecruitmentListClient() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const limit = DEFAULT_PAGE_SIZE;

  const params = useMemo(() => ({ page, limit, search: search.trim() || undefined }), [page, limit, search]);

  const { data, isLoading, isFetching, isError } = useGuildRecruitmentList(params, {
    refetchOnWindowFocus: false,
  });

  const list = data?.list ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const goWrite = () => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    router.push('/guild-recruitment/write');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: { xs: 2, md: 6 } }}>
      <PageBanner />
      <Container sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, md: 3 } }}>
        <PageHeader
          title="길드원 모집"
          actions={
            <Button variant="contained" startIcon={<AddIcon />} onClick={goWrite}>
              글쓰기
            </Button>
          }
        />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          길드명·서버·전시즌 등급·모집 내용을 올려 길드원을 모집할 수 있습니다.
        </Typography>

        <Card variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              label="검색 (길드명·서버·내용)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              sx={{ flex: 1, minWidth: 200 }}
            />
            <Button variant="outlined" onClick={handleSearch}>
              검색
            </Button>
          </Box>
        </Card>

        {isLoading || isFetching ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : isError ? (
          <Typography color="error">목록을 불러오지 못했습니다.</Typography>
        ) : (
          <>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>길드명</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>서버</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>전시즌 등급</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>작성자</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>등록일</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {list.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        등록된 글이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    list.map((row) => (
                      <TableRow
                        key={String(row.post_id)}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => router.push(`/guild-recruitment/${row.post_id}`)}
                      >
                        <TableCell>
                          <Typography fontWeight={600} component={Link} href={`/guild-recruitment/${row.post_id}`} color="primary" onClick={(e) => e.stopPropagation()}>
                            {row.guild_name}
                          </Typography>
                          {row.content_preview ? (
                            <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ maxWidth: 360 }}>
                              {row.content_preview}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell>{row.server_name}</TableCell>
                        <TableCell>{row.last_season_grade}</TableCell>
                        <TableCell>{row.user_name || row.user_id || '-'}</TableCell>
                        <TableCell>{formatPostedAt(row.crt_date)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, p) => setPage(p)}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
