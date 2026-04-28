'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CounterMatchupRow, MonsterDetail } from '@/features/rta/types/rta';
import { useRtaRatingGradeRules, useRtaSeasonSelect, useRtaSeasons } from '@/features/rta/hooks/useRtaData';
import RtaSeasonTierSelectRow from '@/features/rta/components/RtaSeasonTierSelectRow';
import { getRenderableImageUrl } from '@/shared/utils/image';

function last7DayLabels(): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(
      `${d.getMonth() + 1}/${d.getDate()}`,
    );
  }
  return out;
}

/** 승률 7일 추이 — 일별 API 부재 시 현재 승률 기준 플레이스홀더 곡선 */
function buildWinRateSeries(baseWin: number): { day: string; win_rate: number }[] {
  const labels = last7DayLabels();
  return labels.map((day, i) => {
    const wobble = Math.sin(i * 0.8) * 2.5 + (i % 2 === 0 ? 1.2 : -1.2);
    const v = Math.min(100, Math.max(0, baseWin + wobble));
    return { day, win_rate: Math.round(v * 10) / 10 };
  });
}

const PICK_SLOTS = ['1픽', '2픽', '3픽', '4픽'] as const;

interface MonsterDetailRtaOverviewTabProps {
  rtaDetail: MonsterDetail | null;
  /** 클라이언트 RTA 상세 조회 중 */
  rtaOverviewPending?: boolean;
  /** API 오류로 데이터 없음 */
  rtaOverviewFailed?: boolean;
}

export default function MonsterDetailRtaOverviewTab({
  rtaDetail,
  rtaOverviewPending = false,
  rtaOverviewFailed = false,
}: MonsterDetailRtaOverviewTabProps) {
  const { data: seasonsData } = useRtaSeasons();
  const { seasonSelectValue, setSeason, seasonOptions } = useRtaSeasonSelect(seasonsData);
  const { data: gradeRules = [], isLoading: tierRulesLoading } = useRtaRatingGradeRules();
  const [tierSelection, setTierSelection] = useState('CH_ALL');

  const soloCounters = useMemo(
    () =>
      (rtaDetail?.counter_matchups ?? [])
        .filter((r: CounterMatchupRow) => Number(r.opponentComboSize ?? 0) === 1)
        .slice(0, 5),
    [rtaDetail?.counter_matchups],
  );

  const chartData = useMemo(
    () =>
      buildWinRateSeries(rtaDetail?.win_rate != null && Number.isFinite(Number(rtaDetail.win_rate))
        ? Number(rtaDetail.win_rate)
        : 50),
    [rtaDetail?.win_rate],
  );

  if (rtaOverviewPending) {
    return (
      <Box sx={{ py: 2 }}>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          RTA 집계를 불러오는 중입니다…
        </Typography>
      </Box>
    );
  }

  if (rtaOverviewFailed) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        RTA 집계를 불러오지 못했습니다. API 주소(NEXT_PUBLIC_API_BASE_URL)와 서버 상태를 확인해 주세요.
      </Alert>
    );
  }

  if (!rtaDetail) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        이 몬스터에 대한 RTA 집계 데이터가 아직 없습니다.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
        RTA 개요 — 시즌·티어를 선택하면 추후 동일 조건으로 지표가 갱신됩니다. (일부 항목은 서버 집계 API 연동 예정)
      </Typography>

      <RtaSeasonTierSelectRow
        seasonSelectValue={seasonSelectValue}
        setSeason={setSeason}
        seasonOptions={seasonOptions}
        tierSelection={tierSelection}
        setTierSelection={setTierSelection}
        gradeRules={gradeRules}
        tierRulesLoading={tierRulesLoading}
        seasonLabelId="monster-detail-rta-overview-season"
      />

      <Alert severity="warning" variant="outlined" sx={{ mb: 2, fontSize: '0.8125rem' }}>
        픽 순서별 선택률·벤률·일별 승률 곡선의 <strong>티어 필터 반영</strong>은 백엔드 API가 준비되는 대로 연결됩니다.
      </Alert>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            요약 지표
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">픽횟수</Typography>
              <Typography variant="h6" fontWeight={700}>{rtaDetail.pick_count.toLocaleString()}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">픽률</Typography>
              <Typography variant="h6" fontWeight={700}>{rtaDetail.pick_rate.toFixed(2)}%</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">승률</Typography>
              {rtaDetail.win_rate != null && Number.isFinite(Number(rtaDetail.win_rate)) ? (
                <Typography
                  variant="h6"
                  fontWeight={700}
                  color={Number(rtaDetail.win_rate) >= 50 ? 'success.main' : 'error.main'}
                >
                  {Number(rtaDetail.win_rate).toFixed(2)}%
                </Typography>
              ) : (
                <Typography variant="h6" fontWeight={700} color="text.secondary">
                  —
                </Typography>
              )}
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">벤율</Typography>
              <Typography variant="h6" fontWeight={700}>{rtaDetail.ban_rate.toFixed(2)}%</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          최근 7일 승률 추이 (%)
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          {rtaDetail.win_rate != null && Number.isFinite(Number(rtaDetail.win_rate))
            ? '일별 집계 API 전까지 현재 승률을 기준으로 한 참고용 곡선입니다.'
            : '시즌 승률을 집계할 수 없어(경기 미참전 등) 참고 곡선을 표시하지 않습니다.'}
        </Typography>
        {rtaDetail.win_rate != null && Number.isFinite(Number(rtaDetail.win_rate)) ? (
          <Box sx={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => [`${v ?? '—'}%`, '승률']} />
                <Line type="monotone" dataKey="win_rate" stroke="#1976d2" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Alert severity="info" variant="outlined" sx={{ py: 1 }}>
            승·패가 확정된 참전 기록이 없어 곡선을 그리지 않습니다.
          </Alert>
        )}
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
          mb: 2,
        }}
      >
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              픽 순서별 선택률
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>순서</TableCell>
                    <TableCell align="right">선택률</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {PICK_SLOTS.map((slot) => (
                    <TableRow key={slot}>
                      <TableCell>{slot}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>—</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              픽 순서별 벤률
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>순서</TableCell>
                    <TableCell align="right">벤률</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {PICK_SLOTS.map((slot) => (
                    <TableRow key={`b-${slot}`}>
                      <TableCell>{slot}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>—</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>

      <Typography variant="subtitle1" fontWeight={800} sx={{ mt: 2, mb: 1 }}>
        몬스터 상성
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              상대하기 어려운 몬스터 (카운터 · 솔로)
            </Typography>
            {soloCounters.length ? (
              <StackedMonsterList rows={soloCounters} />
            ) : (
              <Typography variant="body2" color="text.secondary">데이터가 없습니다.</Typography>
            )}
          </CardContent>
        </Card>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              함께 사용된 몬스터 (듀오 시너지)
            </Typography>
            {rtaDetail.good_combos?.length ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {rtaDetail.good_combos.slice(0, 5).map((c, i) => (
                  <Box key={`${c.monster_id}-${i}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar src={getRenderableImageUrl(c.monster_image)} variant="rounded" sx={{ width: 32, height: 32 }}>
                      {(c.monster_name ?? '?').charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap>{c.monster_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        승률 {c.win_rate.toFixed(1)}% · {c.match_count}판
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">데이터가 없습니다.</Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            장인 랭킹
          </Typography>
          <Typography variant="body2" color="text.secondary">
            해당 몬스터를 주로 사용하는 상위 랭커 5명은 집계 API 연동 후 표시됩니다.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

function StackedMonsterList({ rows }: { rows: CounterMatchupRow[] }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {rows.map((r, i) => (
        <Box key={`${r.opponentComboKey}-${i}`} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="body2" sx={{ minWidth: 0 }} noWrap title={String(r.opponentLabel ?? r.opponentComboKey)}>
            {r.opponentLabel ?? r.opponentComboKey ?? '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
            승률 {r.winRate != null ? `${Number(r.winRate).toFixed(1)}%` : '—'}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
