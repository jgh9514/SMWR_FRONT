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
import { getSwexPlayerImageUrl } from '@/shared/utils/image';
import type { RtaSummonerRankingRow } from '@/features/rta/types/rta';

const PAGE_SIZE = 50;

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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
      channelUid:
        row.channel_uid != null && String(row.channel_uid).trim() !== ''
          ? String(row.channel_uid)
          : undefined,
      name: row.wizard_name?.trim() || '—',
      country: row.country?.trim() || '',
      score: toNum(row.score),
      rating: row.rating_id != null ? toNum(row.rating_id) : null,
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
          점수로 순위를 매깁니다. 게임 내 공식 랭킹·전체 유저와는 다를 수 있습니다.
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
                  <TableCell width="10%">순위</TableCell>
                  <TableCell width="12%">국가</TableCell>
                  <TableCell width="50%">소환사</TableCell>
                  <TableCell width="28%" align="right">
                    RTA 점수
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                          <Box
                            component="img"
                            src={getSwexPlayerImageUrl(r.channelUid || r.wizardId)}
                            alt=""
                            loading="lazy"
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              objectFit: 'cover',
                              flexShrink: 0,
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: 'action.hover',
                            }}
                          />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {r.name}
                            </Typography>
                            {r.wizardId ? (
                              <Typography variant="caption" color="text.secondary" noWrap display="block">
                                {r.wizardId}
                              </Typography>
                            ) : null}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          verticalAlign: 'middle',
                          fontWeight: 800,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 1,
                            flexWrap: 'nowrap',
                          }}
                        >
                          {r.rating != null && getRatingStars(r.rating) > 0 ? (
                            <Box
                              component="span"
                              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}
                              aria-hidden
                            >
                              {Array.from({ length: getRatingStars(r.rating) }).map((_, i) => (
                                <StarIcon
                                  key={i}
                                  sx={{
                                    fontSize: 14,
                                    color: getRatingColor(r.rating ?? undefined),
                                    flexShrink: 0,
                                  }}
                                />
                              ))}
                            </Box>
                          ) : null}
                          <Typography component="span" variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                            {r.score.toLocaleString()}
                          </Typography>
                        </Box>
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
