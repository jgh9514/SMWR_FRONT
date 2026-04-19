'use client';

import { keepPreviousData } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import RtaRatingStarIcons from '@/features/rta/components/RtaRatingStarIcons';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import { useRtaSummonerRanking, useRtaSeasonSelect } from '@/features/rta/hooks/useRtaData';
import { useRtaSeasonsContext } from '@/features/rta/context/RtaSeasonsContext';
import { getSwexPlayerImageUrl } from '@/shared/utils/image';
import type { RtaSummonerRankingRow } from '@/features/rta/types/rta';

const PAGE_SIZE = 50;
/** WAS `RtaServiceImpl.RTA_SUMMONER_RANKING_MAX_PAGES` — 상위 풀 500명 기준 최대 페이지 수 */
const MAX_PAGES = 10;
/** WAS `RtaServiceImpl.RTA_SUMMONER_RANKING_MAX_ROWS` — 국가 칩 비율용 샘플만 별도 요청 */
const SUMMONER_RANKING_MAX = 500;

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function countrySharesFromRankings(rows: RtaSummonerRankingRow[]): { code: string; pct: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const c = (r.country ?? '').trim() || '—';
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const total = rows.length || 1;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([code, n]) => ({ code, pct: (100 * n) / total }));
}

function WinRateBar({ wins, total }: { wins: number; total: number }) {
  if (total <= 0) {
    return (
      <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.75rem' }}>
        —
      </Typography>
    );
  }
  const losses = Math.max(0, total - wins);
  const pct = (wins / total) * 100;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flexWrap: 'nowrap' }}>
      <Box
        sx={{
          flex: 1,
          minWidth: 72,
          maxWidth: 140,
          height: 10,
          borderRadius: 1,
          overflow: 'hidden',
          display: 'flex',
          bgcolor: 'action.hover',
        }}
      >
        <Box sx={{ flex: wins, bgcolor: 'success.main', minWidth: wins > 0 ? 2 : 0 }} />
        <Box sx={{ flex: losses, bgcolor: 'error.dark', minWidth: losses > 0 ? 2 : 0 }} />
      </Box>
      <Typography
        variant="body2"
        sx={{
          fontSize: '0.75rem',
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          color: pct >= 50 ? 'success.main' : 'error.light',
          flexShrink: 0,
        }}
      >
        {pct.toFixed(1)}%
      </Typography>
    </Box>
  );
}

export default function RtaSummonerRankingClient() {
  const [page, setPage] = useState(1);
  const { data: seasonsData } = useRtaSeasonsContext();
  const { seasonSelectValue, seasonIdForApi, setSeason, seasonOptions } = useRtaSeasonSelect(seasonsData);

  const offset = (page - 1) * PAGE_SIZE;

  const [countryFilter, setCountryFilter] = useState<string | null>(null);

  /** 페이지·국가 필터는 서버 집계 — 이동할 때마다 POST. 이전 페이지 데이터를 유지해 로딩 중 total=0 → pageCount=1 로 떨어지며 1페이지로 리셋되는 현상 방지 */
  const {
    data: pageData,
    isLoading: loadingPage,
    isFetching: fetchingPage,
    error: errPage,
  } = useRtaSummonerRanking(PAGE_SIZE, offset, seasonSelectValue, {
    country: countryFilter ?? undefined,
    seasonId: seasonIdForApi,
    placeholderData: keepPreviousData,
  });

  /** 첫 로드만 전체 스피너 — 이후 페이지 이동은 테이블 상단 프로그레스 */
  const tableInitialLoading = loadingPage && !pageData;
  const tablePageFetching = fetchingPage && pageData != null;

  /** 국가 칩: 상위 N명 풀 전체 분포(필터 없음) — 페이지 쿼리와 분리 */
  const { data: distSampleData, error: errDistSample } = useRtaSummonerRanking(
    SUMMONER_RANKING_MAX,
    0,
    seasonSelectValue,
    { seasonId: seasonIdForApi },
  );

  const total = toNum(pageData?.total);
  const pageCount = Math.min(MAX_PAGES, Math.max(1, Math.ceil(total / PAGE_SIZE)));

  useEffect(() => {
    if (tableInitialLoading) return;
    if (total <= 0) return;
    if (page > pageCount) {
      queueMicrotask(() => setPage(pageCount));
    }
  }, [page, pageCount, total, tableInitialLoading]);

  const rankings = useMemo(() => pageData?.rankings ?? [], [pageData]);

  const countrySampleLoading = !distSampleData && !errDistSample;

  const handleCountryChipClick = (code: string) => {
    setCountryFilter((prev) => (prev === code ? null : code));
    setPage(1);
  };

  const countryChips = useMemo(
    () => countrySharesFromRankings(distSampleData?.rankings ?? []),
    [distSampleData?.rankings],
  );

  const rows = useMemo(() => {
    return rankings.map((row: RtaSummonerRankingRow) => {
      const wid = row.wizard_id;
      const cuid = row.channel_uid;
      const wname = row.wizard_name;
      return {
        rank: toNum(row.rank_position),
        wizardId: wid != null && String(wid).trim() !== '' ? String(wid) : '',
        channelUid:
          cuid != null && String(cuid).trim() !== '' ? String(cuid) : undefined,
        name: (typeof wname === 'string' ? wname.trim() : '') || '—',
        country: (typeof row.country === 'string' ? row.country.trim() : '') || '',
        score: toNum(row.score),
        ratingId: row.rating_id != null ? Number(row.rating_id) : undefined,
        winCount: toNum(row.win_count),
        matchCount: toNum(row.match_count),
      };
    });
  }, [rankings]);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <PageHeader title="RTA 소환사 랭킹" backPath="/rta" />

      <Box sx={{ mb: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
        >
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="rta-season-label">시즌</InputLabel>
            <Select
              labelId="rta-season-label"
              label="시즌"
              value={seasonSelectValue}
              onChange={(e) => {
                setSeason(String(e.target.value));
                setCountryFilter(null);
                setPage(1);
              }}
            >
              {seasonOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 0.75 }}>
              <Typography variant="caption" color="text.secondary">
                국가 비율 (상위 {SUMMONER_RANKING_MAX}명 샘플) · 표는 페이지마다 서버 조회
              </Typography>
              {countryFilter != null ? (
                <Button
                  size="small"
                  variant="text"
                  onClick={() => {
                    setCountryFilter(null);
                    setPage(1);
                  }}
                >
                  국가 필터 해제
                </Button>
              ) : null}
            </Box>
            <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
              {countryChips.length === 0 && countrySampleLoading ? (
                <Typography variant="caption" color="text.disabled">
                  불러오는 중…
                </Typography>
              ) : countryChips.length === 0 && errDistSample ? (
                <Typography variant="caption" color="text.disabled">
                  국가 분포를 불러오지 못했습니다.
                </Typography>
              ) : countryChips.length === 0 ? (
                <Typography variant="caption" color="text.disabled">
                  국가 코드가 없는 데이터입니다.
                </Typography>
              ) : (
                countryChips.map(({ code, pct }) => {
                  const selected = countryFilter === code;
                  return (
                    <Paper
                      key={code}
                      component="button"
                      type="button"
                      variant="outlined"
                      onClick={() => handleCountryChipClick(code)}
                      aria-pressed={selected}
                      sx={{
                        px: 1.25,
                        py: 0.5,
                        borderRadius: 999,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.75,
                        borderColor: selected ? 'primary.main' : 'divider',
                        bgcolor: selected ? 'action.selected' : 'action.hover',
                        cursor: 'pointer',
                        font: 'inherit',
                        color: 'inherit',
                        textAlign: 'left',
                        '&:hover': {
                          borderColor: 'primary.light',
                          bgcolor: 'action.selected',
                        },
                      }}
                    >
                      {code !== '—' && code.length === 2 ? (
                        <Box
                          component="img"
                          src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`}
                          alt=""
                          sx={{ width: 18, height: 12, objectFit: 'cover', borderRadius: 0.25 }}
                        />
                      ) : (
                        <Box sx={{ width: 18, height: 12, borderRadius: 0.25, bgcolor: 'action.selected' }} />
                      )}
                      <Typography variant="caption" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {code} {pct.toFixed(0)}%
                      </Typography>
                    </Paper>
                  );
                })
              )}
            </Stack>
          </Box>
        </Stack>
      </Box>

      {tableInitialLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : errPage ? (
        <Typography color="error">{errPage.message || '불러오기에 실패했습니다.'}</Typography>
      ) : (
        <>
          <Box sx={{ position: 'relative', mb: 2 }}>
            {tablePageFetching ? (
              <LinearProgress
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 2,
                  borderRadius: '8px 8px 0 0',
                }}
              />
            ) : null}
            <TableContainer
              component={Paper}
              variant="outlined"
              aria-busy={tablePageFetching}
              sx={{
                borderRadius: 2,
                overflowX: 'auto',
                ...(tablePageFetching ? { opacity: 0.72, transition: 'opacity 0.2s' } : {}),
              }}
            >
            <Table size="small" sx={{ minWidth: 640, tableLayout: 'fixed', width: '100%' }} stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell width="6%" sx={{ py: 1.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                    #
                  </TableCell>
                  <TableCell width="32%" sx={{ py: 1.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                    소환사 명
                  </TableCell>
                  <TableCell width="12%" sx={{ py: 1.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                    서버
                  </TableCell>
                  <TableCell width="14%" sx={{ py: 1.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                    점수
                  </TableCell>
                  <TableCell width="10%" sx={{ py: 1.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                    게임
                  </TableCell>
                  <TableCell width="26%" sx={{ py: 1.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                    승률
                  </TableCell>
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
                  rows.map((r) => {
                    const profileHref =
                      r.wizardId !== '' ? `/rta/player/${encodeURIComponent(r.wizardId)}` : null;
                    const serverLabel = r.country ? r.country.toUpperCase() : '—';
                    return (
                      <TableRow key={r.wizardId || `${r.rank}-${r.name}`} hover>
                        <TableCell
                          sx={{
                            fontWeight: 800,
                            fontVariantNumeric: 'tabular-nums',
                            verticalAlign: 'middle',
                            py: 1.25,
                          }}
                        >
                          {r.rank}
                        </TableCell>
                        <TableCell
                          sx={{
                            verticalAlign: 'middle',
                            overflow: 'hidden',
                            py: 1.25,
                          }}
                          title={r.wizardId ? `${r.name} (${r.wizardId})` : r.name}
                        >
                          {profileHref ? (
                            <Link
                              href={profileHref}
                              prefetch={false}
                              style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                                <Box
                                  component="img"
                                  src={getSwexPlayerImageUrl(r.channelUid || r.wizardId)}
                                  alt=""
                                  loading="lazy"
                                  sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    flexShrink: 0,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'action.hover',
                                  }}
                                />
                                <Typography variant="body2" fontWeight={700} noWrap sx={{ minWidth: 0 }}>
                                  {r.name}
                                </Typography>
                              </Box>
                            </Link>
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                              <Box
                                component="img"
                                src={getSwexPlayerImageUrl(r.channelUid || r.wizardId)}
                                alt=""
                                loading="lazy"
                                sx={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  flexShrink: 0,
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  bgcolor: 'action.hover',
                                }}
                              />
                              <Typography variant="body2" fontWeight={700} noWrap>
                                {r.name}
                              </Typography>
                            </Box>
                          )}
                        </TableCell>
                        <TableCell sx={{ verticalAlign: 'middle', py: 1.25 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {r.country && r.country !== '—' && /^[a-z]{2}$/i.test(r.country) ? (
                              <Box
                                component="img"
                                src={`https://flagcdn.com/w40/${r.country.toLowerCase()}.png`}
                                alt=""
                                sx={{ width: 22, height: 15, objectFit: 'cover', borderRadius: 0.5, flexShrink: 0 }}
                              />
                            ) : null}
                            <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                              {serverLabel}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell
                          sx={{
                            verticalAlign: 'middle',
                            py: 1.25,
                            fontWeight: 800,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                            <RtaRatingStarIcons rating={r.ratingId} size={13} />
                            {r.score.toLocaleString()}
                          </Box>
                        </TableCell>
                        <TableCell
                          sx={{ verticalAlign: 'middle', py: 1.25, fontVariantNumeric: 'tabular-nums' }}
                        >
                          {r.matchCount.toLocaleString()}
                        </TableCell>
                        <TableCell sx={{ verticalAlign: 'middle', py: 1.25 }}>
                          <WinRateBar wins={r.winCount} total={r.matchCount} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          </Box>

          {pageCount > 1 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
              <Pagination
                count={pageCount}
                page={Math.min(page, pageCount)}
                onChange={(_, p) => setPage(p)}
                color="primary"
                size="small"
                showFirstButton
                showLastButton
              />
            </Box>
          ) : null}

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            총 {total.toLocaleString()}명 (상위 {SUMMONER_RANKING_MAX}명 풀 내) · 페이지당 {PAGE_SIZE}명 · 최대 {MAX_PAGES}페이지
            {countryFilter != null ? ` · 국가 필터: ${countryFilter}` : ''}
          </Typography>
        </>
      )}
    </Container>
  );
}
