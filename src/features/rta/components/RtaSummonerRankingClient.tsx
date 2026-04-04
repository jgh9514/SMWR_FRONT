'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
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
import PageHeader from '@/shared/ui/page-header/PageHeader';
import RtaRatingStarIcons from '@/features/rta/components/RtaRatingStarIcons';
import { useRtaSummonerRanking } from '@/features/rta/hooks/useRtaData';
import { getRtaTierShortLabel, getRatingColor } from '@/shared/utils';
import { getMonsterImageUrl, getSwexPlayerImageUrl } from '@/shared/utils/image';
import type { RtaSummonerRankingRow } from '@/features/rta/types/rta';

const PAGE_SIZE = 50;

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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

/** MyBatis map + JSON에서 스네이크/카멜 혼용 가능 */
function pickMostMonsterSlot(row: RtaSummonerRankingRow, slot: 1 | 2 | 3) {
  const r = row as unknown as Record<string, unknown>;
  const idKeys = [`most_monster_${slot}_id`, `mostMonster${slot}Id`] as const;
  const nameKeys = [`most_monster_${slot}_name`, `mostMonster${slot}Name`] as const;
  const imageKeys = [`most_monster_${slot}_image`, `mostMonster${slot}Image`] as const;
  const pickKeys = [`most_monster_${slot}_pick_count`, `mostMonster${slot}PickCount`] as const;

  let id = '';
  for (const k of idKeys) {
    const v = r[k];
    if (v != null && String(v).trim() !== '') {
      id = String(v);
      break;
    }
  }
  let name = '';
  for (const k of nameKeys) {
    const v = r[k];
    if (v != null && String(v).trim() !== '') {
      name = String(v);
      break;
    }
  }
  let image = '';
  for (const k of imageKeys) {
    const v = r[k];
    if (v != null && String(v).trim() !== '') {
      image = String(v);
      break;
    }
  }
  let pickCount = 0;
  for (const k of pickKeys) {
    const v = r[k];
    if (v != null && String(v).trim() !== '') {
      pickCount = toNum(v);
      break;
    }
  }
  return { id, name: name.trim() || '—', image, pickCount };
}

function MostMonstersCell({ row }: { row: RtaSummonerRankingRow }) {
  const slots = [1, 2, 3] as const;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, justifyContent: 'flex-start', flexWrap: 'nowrap' }}>
      {slots.map((slot) => {
        const m = pickMostMonsterSlot(row, slot);
        const title =
          m.id && m.pickCount > 0
            ? `${m.name} · 필드 ${m.pickCount}회`
            : m.id
              ? m.name
              : '';
        if (!m.id) {
          return (
            <Box
              key={slot}
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                border: '1px dashed',
                borderColor: 'divider',
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                —
              </Typography>
            </Box>
          );
        }
        const imgSrc = m.image ? getMonsterImageUrl(m.image) : getMonsterImageUrl('/images/default-monster.png');
        const href = `/rta/monster-stats/${encodeURIComponent(m.id)}`;
        const img = (
          <Box
            component="img"
            src={imgSrc}
            alt=""
            title={title}
            loading="lazy"
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1,
              objectFit: 'cover',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'action.hover',
              display: 'block',
              flexShrink: 0,
            }}
          />
        );
        return (
          <Link
            key={slot}
            href={href}
            prefetch={false}
            title={title}
            style={{ textDecoration: 'none', lineHeight: 0 }}
          >
            {img}
          </Link>
        );
      })}
    </Box>
  );
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
      winCount: toNum(row.win_count),
      matchCount: toNum(row.match_count),
      mostRow: row,
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
          점수로 순위를 매깁니다. <strong>승률</strong>은 동일 데이터에서 해당 소환사가 참가한 전체 경기 기준입니다.{' '}
          <strong>모스트 몬스터</strong>는 벤으로 제외된 몬스터를 뺀 뒤 필드에 가장 많이 출전한 순 상위 3마리입니다. 게임 내
          공식 랭킹·전체 유저와는 다를 수 있습니다.
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
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ borderRadius: 2, mb: 2, overflowX: 'auto' }}
          >
            <Table size="small" sx={{ minWidth: 720, tableLayout: 'fixed', width: '100%' }} stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell width="7%" sx={{ py: 1.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                    순위
                  </TableCell>
                  <TableCell width="26%" sx={{ py: 1.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                    소환사명
                  </TableCell>
                  <TableCell width="8%" sx={{ py: 1.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                    지역
                  </TableCell>
                  <TableCell width="18%" sx={{ py: 1.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                    티어
                  </TableCell>
                  <TableCell width="20%" sx={{ py: 1.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                    승률
                  </TableCell>
                  <TableCell width="21%" sx={{ py: 1.5, fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                    모스트 몬스터
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
                    const tierLabel = r.rating != null ? getRtaTierShortLabel(r.rating) : '—';
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
                          {r.country ? (
                            <Box
                              component="img"
                              src={`https://flagcdn.com/w40/${r.country.toLowerCase()}.png`}
                              alt={r.country}
                              sx={{ width: 24, height: 16, objectFit: 'cover', borderRadius: 0.5 }}
                            />
                          ) : (
                            <Typography variant="body2" color="text.disabled">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ verticalAlign: 'middle', py: 1.25 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                              <Typography
                                component="span"
                                sx={{
                                  fontWeight: 900,
                                  fontSize: '0.8rem',
                                  color: r.rating != null ? getRatingColor(r.rating) : 'text.secondary',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {tierLabel}
                              </Typography>
                              {r.rating != null ? <RtaRatingStarIcons rating={r.rating} size={13} gap={1} /> : null}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.25 }}>
                              <Typography
                                component="span"
                                variant="caption"
                                sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'text.primary' }}
                              >
                                {r.score.toLocaleString()}
                              </Typography>
                              <Typography
                                component="span"
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontSize: '0.65rem' }}
                              >
                                점
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ verticalAlign: 'middle', py: 1.25 }}>
                          <WinRateBar wins={r.winCount} total={r.matchCount} />
                        </TableCell>
                        <TableCell sx={{ verticalAlign: 'middle', py: 1.25 }}>
                          <MostMonstersCell row={r.mostRow} />
                        </TableCell>
                      </TableRow>
                    );
                  })
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
