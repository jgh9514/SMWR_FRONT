'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CircularProgress,
  Container,
  Pagination,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import { useRtaSummonerRanking } from '@/features/rta/hooks/useRtaData';
import { getRatingColor, getRatingStars } from '@/shared/utils';
import type { RtaSummonerRankingRow } from '@/features/rta/types/rta';

const PAGE_SIZE = 50;

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatWhen(raw: unknown): string {
  if (raw == null || raw === '') return '—';
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RtaSummonerRankingClient() {
  const [page, setPage] = useState(1);
  const offset = (page - 1) * PAGE_SIZE;
  const { data, isLoading, error } = useRtaSummonerRanking(PAGE_SIZE, offset);

  const total = toNum(data?.total);
  const rankings = data?.rankings ?? [];
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const rows = useMemo(() => {
    return rankings.map((row: RtaSummonerRankingRow) => ({
      rank: toNum(row.rank_position),
      wizardId: row.wizard_id != null ? String(row.wizard_id) : '',
      name: row.wizard_name?.trim() || '—',
      country: row.country?.trim() || '',
      score: toNum(row.score),
      rating: row.rating_id != null ? toNum(row.rating_id) : null,
      lastAt: row.last_match_at,
    }));
  }, [rankings]);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <PageHeader title="RTA 소환사 랭킹" backPath="/rta" />

      <Card
        elevation={0}
        sx={{
          mb: 3,
          p: { xs: 2, md: 2.5 },
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          집계 방식
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720, lineHeight: 1.6 }}>
          수집된 <strong>실레나 리플레이</strong>만을 대상으로, 소환사마다 <strong>가장 최근에 기록된 경기</strong>의 RTA
          점수·레이팅을 사용해 순위를 매깁니다. 게임 내 공식 랭킹·전체 유저와는 다를 수 있습니다.
        </Typography>
      </Card>

      {isLoading && !data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error.message || '불러오기에 실패했습니다.'}</Typography>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
            <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }} stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell width="8%">순위</TableCell>
                  <TableCell width="12%">국가</TableCell>
                  <TableCell width="28%">소환사</TableCell>
                  <TableCell width="14%" align="right">
                    RTA 점수
                  </TableCell>
                  <TableCell width="22%">레이팅</TableCell>
                  <TableCell width="16%">최근 리플레이</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                        표시할 랭킹 데이터가 없습니다.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.wizardId || `${r.rank}-${r.name}`} hover>
                      <TableCell sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{r.rank}</TableCell>
                      <TableCell sx={{ verticalAlign: 'middle' }}>
                        {r.country ? (
                          <Box
                            component="img"
                            src={`https://flagcdn.com/w40/${r.country.toLowerCase()}.png`}
                            alt={r.country}
                            sx={{ width: 22, height: 16, objectFit: 'cover', borderRadius: 0.5 }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell
                        sx={{
                          verticalAlign: 'middle',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={r.name}
                      >
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {r.name}
                        </Typography>
                        {r.wizardId ? (
                          <Typography variant="caption" color="text.secondary" noWrap display="block">
                            {r.wizardId}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                        {r.score.toLocaleString()}
                      </TableCell>
                      <TableCell sx={{ verticalAlign: 'middle' }}>
                        {r.rating != null ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                            {Array.from({ length: getRatingStars(r.rating) }).map((_, i) => (
                              <StarIcon
                                key={i}
                                sx={{ fontSize: 14, color: getRatingColor(r.rating ?? undefined), flexShrink: 0 }}
                              />
                            ))}
                            <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                              {r.rating}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ verticalAlign: 'middle' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {formatWhen(r.lastAt)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {total > PAGE_SIZE ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
              <Pagination
                count={pageCount}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
                size="small"
                showFirstButton
                showLastButton
              />
            </Box>
          ) : null}

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            총 {total.toLocaleString()}명 · 페이지당 {PAGE_SIZE}명
          </Typography>
        </>
      )}
    </Container>
  );
}
