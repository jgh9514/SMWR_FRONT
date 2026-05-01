'use client';

import { Fragment, memo, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Alert,
  Box,
  CircularProgress,
  Collapse,
  Container,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
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
import { alpha } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import { useRtaMonsterPickBreakdown, useRtaMonsterPickSlotMatches, useRtaPlayerMonsterUsage } from '@/features/rta/hooks/useRtaData';
import { useRtaPlayerSeason } from '@/features/rta/context/RtaPlayerSeasonContext';
import { processRawMatchToMatchItem } from '@/features/rta/utils/processRtaMatchItem';
import { RtaMatchCard } from '@/features/rta/components/RtaMatchCard';
import type { RawMatchItem } from '@/types';
import type {
  RtaMonsterPickBucketRow,
  RtaPlayerMonsterFightSnapshot,
  RtaPlayerMonsterUsageRow,
} from '@/features/rta/types/rta';
import {
  MonsterCell,
  StatsEmptyState,
  TABLE_HEAD_CELL_SX,
  NUMERIC_CELL_SX,
  formatPercentage,
  toNum,
} from '@/features/rta/components/RtaMonsterStatsClient';

function n(v: unknown): number {
  if (v == null || v === '') return 0;
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function rowFromApi(r: RtaPlayerMonsterUsageRow & Record<string, unknown>): RtaPlayerMonsterUsageRow {
  const pick = n(r.pick_cnt);
  const ban = n(r.ban_cnt);
  /** 화면 픽횟수 = 픽 수 + 벤 수(WAS actual_pick_cnt 또는 합산 폴백) */
  const actual =
    r.actual_pick_cnt != null ? n(r.actual_pick_cnt as unknown) : pick + ban;
  return {
    unit_master_id: n(r.unit_master_id),
    pick_cnt: pick,
    ban_cnt: ban,
    win_cnt: n(r.win_cnt),
    lose_cnt: n(r.lose_cnt),
    first_pick_cnt: n(r.first_pick_cnt),
    actual_pick_cnt: actual,
    monster_name: r.monster_name != null ? String(r.monster_name) : null,
    monster_image: r.monster_image != null ? String(r.monster_image) : null,
    monster_elemental: r.monster_elemental != null ? String(r.monster_elemental) : null,
    pick_rate_pct: r.pick_rate_pct == null ? null : n(r.pick_rate_pct),
    ban_rate_pct: r.ban_rate_pct == null ? null : n(r.ban_rate_pct),
    win_rate_pct: r.win_rate_pct == null ? null : n(r.win_rate_pct),
    first_pick_rate_pct: r.first_pick_rate_pct == null ? null : n(r.first_pick_rate_pct),
  };
}

/**
 * 선픽/후픽 스네이크 픽 레이아웃 — pick_slot_no(1~5 per player) 5칸을 3열로
 *
 * 선픽(team_side=1): col[1번] | col[2번, 3번] | col[4번, 5번]   → 전체 1·4·5·8·9번째
 * 후픽(team_side=2): col[1번, 2번] | col[3번, 4번] | col[5번]   → 전체 2·3·6·7·10번째
 *
 * 각 슬롯: 네모 박스 + 아래에 픽 비중(fill), 중앙 텍스트 픽률, 박스 밑 승률
 */

/** 선픽/후픽별 slot→col 매핑 */
const FIRST_PICK_COLS: readonly (readonly number[])[] = [[1], [2, 3], [4, 5]];
const SECOND_PICK_COLS: readonly (readonly number[])[] = [[1, 2], [3, 4], [5]];

/** 선픽 slot 번호 → 전체 드래프트 순서 */
const FIRST_GLOBAL: Record<number, string> = { 1: '1번째', 2: '4번째', 3: '5번째', 4: '8번째', 5: '9번째' };
/** 후픽 slot 번호 → 전체 드래프트 순서 */
const SECOND_GLOBAL: Record<number, string> = { 1: '2번째', 2: '3번째', 3: '6번째', 4: '7번째', 5: '10번째' };

function PickSlotBox({
  slotNo,
  isFirstPick,
  pickSharePct,
  winRatePct,
  eventCnt,
  matchCnt,
  color,
  selected,
  onClick,
}: {
  slotNo: number;
  isFirstPick: boolean;
  pickSharePct: number;
  winRatePct: number | null;
  eventCnt: number;
  /** 논밴으로 이 슬롯에서 이 몬이 나온 판 수(경기 목록과 동일 기준) */
  matchCnt: number;
  color: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const fill = Math.min(100, Math.max(0, pickSharePct));
  const globalLabel = isFirstPick ? FIRST_GLOBAL[slotNo] : SECOND_GLOBAL[slotNo];
  const wr = winRatePct;
  const wrColor = wr == null ? 'text.disabled'
    : wr >= 55 ? 'error.main'
    : wr >= 50 ? 'success.main'
    : 'text.secondary';
  const hasData = eventCnt > 0 || matchCnt > 0;
  const textColor = hasData
    ? (isDark ? '#fff' : theme.palette.getContrastText(alpha(color, 0.35)))
    : 'text.disabled';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      {/* 전체 픽 순서 레이블 */}
      <Typography
        variant="caption"
        sx={{
          fontSize: '0.62rem',
          fontWeight: 700,
          color: hasData ? alpha(color, isDark ? 0.9 : 0.75) : 'text.disabled',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {globalLabel}
      </Typography>

      {/* 박스 — 정사각형 */}
      <Box
        onClick={hasData ? onClick : undefined}
        sx={{
          position: 'relative',
          width: { xs: 46, sm: 58, md: 64 },
          height: { xs: 46, sm: 58, md: 64 },
          borderRadius: 1.5,
          overflow: 'hidden',
          border: '2px solid',
          borderColor: selected
            ? color
            : hasData ? alpha(color, isDark ? 0.45 : 0.3) : alpha(theme.palette.divider, 0.6),
          bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          cursor: hasData ? 'pointer' : 'default',
          boxShadow: selected ? `0 0 0 2px ${alpha(color, 0.4)}` : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          '@media (hover: hover)': {
            '&:hover': hasData ? {
              borderColor: color,
              filter: 'brightness(1.08)',
            } : {},
          },
        }}
      >
        {/* 아래에서 위로 채우는 fill */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${fill}%`,
            background: `linear-gradient(180deg, ${alpha(color, isDark ? 0.55 : 0.45)}, ${alpha(color, isDark ? 0.35 : 0.25)})`,
            transition: 'height 0.45s cubic-bezier(.4,0,.2,1)',
          }}
        />
        {/* 판수 + 픽률 — fill 여부와 무관하게 항상 보이는 색상 */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            gap: 0.3,
            pointerEvents: 'none',
          }}
        >
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: { xs: '0.55rem', sm: '0.6rem' },
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
              color: 'text.secondary',
              textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.8)' : '0 1px 2px rgba(255,255,255,0.8)',
            }}
          >
            {hasData ? `${matchCnt}판` : ''}
          </Typography>
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: { xs: '0.68rem', sm: '0.78rem' },
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
              color: hasData ? 'text.primary' : 'text.disabled',
              textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.8)' : '0 1px 2px rgba(255,255,255,0.8)',
            }}
          >
            {hasData ? `${fill.toFixed(1)}%` : '—'}
          </Typography>
        </Box>
      </Box>

      {/* 박스 아래 승률 */}
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: '0.68rem',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          color: wrColor,
        }}
      >
        {wr == null ? '—' : `${wr.toFixed(1)}%`}
      </Typography>
    </Box>
  );
}

function PickSnakeGrid({
  slots,
  isFirstPick,
  color,
  selectedSlotNo,
  onSlotClick,
}: {
  slots: RtaMonsterPickBucketRow[];
  isFirstPick: boolean;
  color: string;
  selectedSlotNo: number | null;
  onSlotClick: (slotNo: number) => void;
}) {
  const colPattern = isFirstPick ? FIRST_PICK_COLS : SECOND_PICK_COLS;
  const slotMap = new Map(slots.map((s) => [s.pick_slot_no ?? 0, s]));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', gap: { xs: 0.75, sm: 1, md: 1.5 }, alignItems: 'center', justifyContent: 'center' }}>
      {colPattern.map((colSlots, colIdx) => (
        <Stack
          key={colIdx}
          direction="column"
          gap={{ xs: 0.75, sm: 1 }}
          sx={{ alignItems: 'center', justifyContent: 'center' }}
        >
          {colSlots.map((slotNo) => {
            const row = slotMap.get(slotNo);
            return (
              <PickSlotBox
                key={slotNo}
                slotNo={slotNo}
                isFirstPick={isFirstPick}
                pickSharePct={row ? toNum(row.pick_share_pct) : 0}
                winRatePct={row?.win_rate_pct != null ? toNum(row.win_rate_pct) : null}
                eventCnt={row ? toNum(row.event_cnt) : 0}
                matchCnt={row ? toNum(row.field_cnt) : 0}
                color={color}
                selected={selectedSlotNo === slotNo}
                onClick={() => onSlotClick(slotNo)}
              />
            );
          })}
        </Stack>
      ))}
    </Box>
  );
}

/** 선택된 슬롯의 경기 목록 패널 */
function SlotMatchesPanel({
  wizardId,
  seasonCode,
  seasonId,
  unitMasterId,
  teamSide,
  pickSlotNo,
  color,
}: {
  wizardId: string;
  seasonCode: string | null;
  seasonId: number | null;
  unitMasterId: number | null;
  teamSide: number;
  pickSlotNo: number;
  color: string;
}) {
  const { data, isLoading, error } = useRtaMonsterPickSlotMatches(
    wizardId, seasonCode, seasonId, unitMasterId, teamSide, pickSlotNo,
  );
  const matches = (data?.matches ?? []).map((r) =>
    processRawMatchToMatchItem(r as unknown as RawMatchItem),
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  if (error) {
    return (
      <Typography variant="body2" color="error" sx={{ p: 1 }}>
        불러오기에 실패했습니다.
      </Typography>
    );
  }
  if (matches.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
        이 슬롯에 수집된 경기가 없습니다.
      </Typography>
    );
  }
  return (
    <Stack spacing={1} sx={{ p: 0 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color, px: { xs: 1, sm: 1.5 }, pt: { xs: 1, sm: 1.25 } }}>
        최근 {matches.length}경기
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, px: { xs: 0.5, sm: 1 }, pb: { xs: 0.75, sm: 1 } }}>
        {matches.map((match) => (
          <RtaMatchCard
            key={`${match.p1Id}-${match.p2Id}-${match.date}`}
            match={match}
            wizardId={wizardId}
          />
        ))}
      </Box>
    </Stack>
  );
}

/** 펼침 행 — 선픽/후픽 스네이크 그리드 픽 비중 + 승률 + 슬롯 클릭 경기 목록 */
function MonsterPickSlotBreakdownBlock({
  rows,
  loading,
  wizardId,
  seasonCode,
  seasonId,
  unitMasterId,
}: {
  rows: RtaMonsterPickBucketRow[];
  loading: boolean;
  wizardId: string;
  seasonCode: string | null;
  seasonId: number | null;
  unitMasterId: number | null;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  /** { teamSide, pickSlotNo } | null */
  const [selected, setSelected] = useState<{ teamSide: number; pickSlotNo: number } | null>(null);

  const handleSlotClick = (teamSide: number, pickSlotNo: number) => {
    setSelected((prev) =>
      prev?.teamSide === teamSide && prev?.pickSlotNo === pickSlotNo ? null : { teamSide, pickSlotNo },
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={26} aria-label="슬롯별 집계 불러오는 중" />
      </Box>
    );
  }
  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="text.disabled" sx={{ py: 1.5, textAlign: 'center' }}>
        슬롯별 기록이 없습니다.
      </Typography>
    );
  }

  const firstRows = rows.filter((b) => (b.team_side ?? 1) === 1);
  const secondRows = rows.filter((b) => b.team_side === 2);
  const firstColor = theme.palette.primary.main;
  const secondColor = theme.palette.warning.main;

  const SideSection = ({
    label,
    subtitle,
    color,
    isFirstPick,
    slots,
    teamSide,
  }: {
    label: string;
    subtitle: string;
    color: string;
    isFirstPick: boolean;
    slots: RtaMonsterPickBucketRow[];
    teamSide: number;
  }) => {
    /** 동일 몬·동일 선/후에서 슬롯별 match_cnt 합 = 해당 사이드에서 이 몬이 나온 논밴 판 수(슬롯당 최대 1) */
    const totalMatches = slots.reduce((acc, s) => acc + Math.max(0, toNum(s.field_cnt)), 0);
    const hasTotal = totalMatches > 0;
    const selectedSlotNo = selected?.teamSide === teamSide ? (selected.pickSlotNo ?? null) : null;
    return (
      <Box
        sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: alpha(color, isDark ? 0.3 : 0.2),
          bgcolor: alpha(color, isDark ? 0.05 : 0.02),
          p: { xs: 1, sm: 1.5 },
          minWidth: 0,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <Box sx={{ px: 0.875, py: 0.2, borderRadius: 1, bgcolor: alpha(color, isDark ? 0.22 : 0.12) }}>
            <Typography variant="caption" fontWeight={800} sx={{ color, letterSpacing: '0.02em' }}>
              {label}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.66rem', flex: 1 }}>
            {subtitle}
          </Typography>
          {hasTotal && (
            <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: alpha(color, isDark ? 0.85 : 0.7), flexShrink: 0 }}>
              {totalMatches.toLocaleString()}경기
            </Typography>
          )}
        </Stack>
        <PickSnakeGrid
          slots={slots}
          isFirstPick={isFirstPick}
          color={color}
          selectedSlotNo={selectedSlotNo}
          onSlotClick={(slotNo) => handleSlotClick(teamSide, slotNo)}
        />
        <Box sx={{ mt: 1, display: 'flex', gap: 2 }}>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.62rem' }}>
            박스 색 = 픽 비중
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.62rem' }}>
            숫자 아래 = 승률 · 클릭하면 경기 목록
          </Typography>
        </Box>
        <Collapse in={selectedSlotNo != null} timeout="auto" unmountOnExit>
          <Box sx={{ mt: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: alpha(color, isDark ? 0.3 : 0.2), bgcolor: 'background.paper', overflow: 'hidden', mx: -0.5 }}>
            {selectedSlotNo != null && (
              <SlotMatchesPanel
                wizardId={wizardId}
                seasonCode={seasonCode}
                seasonId={seasonId}
                unitMasterId={unitMasterId}
                teamSide={teamSide}
                pickSlotNo={selectedSlotNo}
                color={color}
              />
            )}
          </Box>
        </Collapse>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: 1.5,
        alignItems: 'start',
      }}
    >
      <SideSection label="선픽" subtitle="전체 1·4·5·8·9번째" color={firstColor} isFirstPick teamSide={1} slots={firstRows} />
      <SideSection label="후픽" subtitle="전체 2·3·6·7·10번째" color={secondColor} isFirstPick={false} teamSide={2} slots={secondRows} />
    </Box>
  );
}

/** 상단 카드 — 시즌 전체 경기 수 + 시즌 승률 */
const SeasonTotalsStrip = memo(function SeasonTotalsStrip({ fight }: { fight: RtaPlayerMonsterFightSnapshot }) {
  const mc = toNum(fight.match_cnt);
  const wr = fight.season_win_rate_pct != null ? toNum(fight.season_win_rate_pct) : null;
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
        gap: { xs: 1.75, sm: 2 },
        alignItems: 'stretch',
      }}
    >
      <Box
        sx={{
          minWidth: 0,
          borderRight: { sm: '1px solid' },
          borderColor: 'divider',
          pr: { sm: 2 },
          borderBottom: { xs: '1px solid', sm: 'none' },
          pb: { xs: 1.75, sm: 0 },
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.02em' }}>
          경기 수
        </Typography>
        <Typography variant="h6" component="p" fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums', m: 0, mt: 0.25 }}>
          {mc.toLocaleString()}
        </Typography>
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.02em' }}>
          시즌 승률
        </Typography>
        <Typography variant="h6" component="p" fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums', m: 0, mt: 0.25 }}>
          {wr == null ? '—' : formatPercentage(wr)}
        </Typography>
      </Box>
    </Box>
  );
});

const PlayerPickStatCard = memo(function PlayerPickStatCard({
  rank,
  row,
  expanded,
  onToggleExpand,
  slotBreakdownLoading,
  slotBuckets,
  wizardId,
  seasonCode,
  seasonId,
}: {
  rank: number;
  row: RtaPlayerMonsterUsageRow;
  expanded: boolean;
  onToggleExpand: () => void;
  slotBreakdownLoading: boolean;
  slotBuckets: RtaMonsterPickBucketRow[];
  wizardId: string;
  seasonCode: string | null;
  seasonId: number | null;
}) {
  const pr = toNum(row.pick_rate_pct);
  const wr =
    row.win_rate_pct == null || row.win_rate_pct === '' ? null : toNum(row.win_rate_pct);
  const br = toNum(row.ban_rate_pct);
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: expanded ? 'primary.light' : 'divider',
        p: { xs: 1.75, sm: 2 },
        background: (t) =>
          `linear-gradient(120deg, ${alpha(t.palette.primary.main, 0.03)} 0%, ${alpha(t.palette.background.paper, 1)} 45%)`,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: (t) => `0 6px 22px ${alpha(t.palette.common.black, 0.07)}`,
        },
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, gap: 0.25 }}>
            <IconButton
              size="small"
              onClick={onToggleExpand}
              aria-expanded={expanded}
              aria-label={expanded ? '슬롯 상세 접기' : '슬롯 상세 펼치기'}
              sx={{ p: '4px', flexShrink: 0 }}
            >
              <ExpandMoreIcon
                sx={{
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  fontSize: '1.35rem',
                }}
              />
            </IconButton>
            <Typography
              component="span"
              sx={{
                fontWeight: 900,
                fontSize: '0.8rem',
                color: 'text.secondary',
                minWidth: '1.35em',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.2,
                pt: '2px',
              }}
            >
              #{rank}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <MonsterCell
              name={row.monster_name ?? undefined}
              image={row.monster_image ?? undefined}
              elemental={row.monster_elemental ?? undefined}
              monsterId={String(row.unit_master_id)}
            />
          </Box>
        </Stack>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, minmax(0, 1fr))' },
            gap: { xs: 1.25, sm: 1.5 },
            alignItems: 'flex-start',
            pt: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
              픽횟수
            </Typography>
            <Typography fontWeight={800} sx={{ ...NUMERIC_CELL_SX, fontSize: '0.95rem' }}>
              {toNum(row.actual_pick_cnt).toLocaleString()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
              픽률
            </Typography>
            <Typography fontWeight={800} sx={{ ...NUMERIC_CELL_SX, fontSize: '0.95rem' }}>
              {formatPercentage(pr)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
              승률
            </Typography>
            <Typography fontWeight={800} sx={{ ...NUMERIC_CELL_SX, fontSize: '0.95rem' }}>
              {wr == null ? '—' : formatPercentage(wr)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
              벤율
            </Typography>
            <Typography fontWeight={800} sx={{ ...NUMERIC_CELL_SX, fontSize: '0.95rem' }}>
              {formatPercentage(br)}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
            1번픽률
          </Typography>
          <Typography fontWeight={800} sx={{ ...NUMERIC_CELL_SX, fontSize: '0.9rem' }}>
            {row.first_pick_rate_pct == null ? '—' : formatPercentage(toNum(row.first_pick_rate_pct))}
          </Typography>
        </Box>
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider sx={{ mb: 1 }} />
          <MonsterPickSlotBreakdownBlock
            loading={expanded && slotBreakdownLoading}
            rows={expanded ? slotBuckets : []}
            wizardId={wizardId}
            seasonCode={seasonCode}
            seasonId={seasonId}
            unitMasterId={row.unit_master_id}
          />
        </Collapse>
      </Stack>
    </Paper>
  );
});

function fightFromApi(fight: Record<string, unknown>): RtaPlayerMonsterFightSnapshot {
  return {
    match_cnt: n(fight.match_cnt),
    non_ban_pick_cnt: n(fight.non_ban_pick_cnt),
    ban_event_cnt: n(fight.ban_event_cnt),
    season_win_rate_pct: fight.season_win_rate_pct == null ? null : n(fight.season_win_rate_pct),
    computed_at: fight.computed_at != null ? String(fight.computed_at) : undefined,
  };
}

export default function RtaPlayerPicksClient() {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const params = useParams<{ wizardId: string }>();
  const wizardId = String(params?.wizardId ?? '').trim();
  const { seasonCode, seasonId } = useRtaPlayerSeason();

  const { data, isLoading, error, isFetching } = useRtaPlayerMonsterUsage(wizardId, seasonCode, {
    seasonId,
    enabled: Boolean(wizardId),
  });

  const [expandedUnitId, setExpandedUnitId] = useState<number | null>(null);
  const { data: breakdown, isFetching: breakdownFetching } = useRtaMonsterPickBreakdown(
    wizardId,
    seasonCode,
    seasonId,
    expandedUnitId,
    { enabled: Boolean(wizardId) },
  );

  const breakdownRows = useMemo(() => {
    if (expandedUnitId == null || breakdown?.unitMasterId !== expandedUnitId) return [];
    return breakdown.buckets ?? [];
  }, [expandedUnitId, breakdown]);

  const toggleExpandedUnit = (unitId: number) => {
    setExpandedUnitId((prev) => (prev === unitId ? null : unitId));
  };

  /** API rows 그대로 사용 — 쿼리 행 수와 화면 행 수 일치(추가 filter 금지) */
  const rawRows = useMemo(
    () =>
      (data?.rows ?? []).map((r) => rowFromApi(r as RtaPlayerMonsterUsageRow & Record<string, unknown>)),
    [data?.rows],
  );
  const fightParsed = data?.fight != null ? fightFromApi(data.fight as Record<string, unknown>) : null;

  if (!wizardId) {
    return (
      <Typography variant="body2" color="text.secondary">
        위자드 ID가 없습니다.
      </Typography>
    );
  }

  if (isLoading && rawRows.length === 0) {
    return (
      <Container maxWidth="xl" disableGutters sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 280 }}>
          <CircularProgress aria-label="통계 불러오는 중" />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" disableGutters sx={{ width: '100%' }}>
      {isFetching ? (
        <LinearProgress
          sx={{ position: 'sticky', top: 0, zIndex: (t) => t.zIndex.appBar - 1, mb: 1 }}
          aria-busy="true"
        />
      ) : null}

      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <BarChartOutlinedIcon color="primary" fontSize="small" aria-hidden />
        <Typography variant="h6" component="h2" fontWeight={800} sx={{ m: 0 }}>
          사용 몬스터
        </Typography>
      </Stack>

      {error ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          통계를 최신으로 가져오지 못했습니다. 새로고침하거나 잠시 후 다시 시도해 주세요.
        </Alert>
      ) : null}

      {fightParsed ? (
        <Paper
          elevation={0}
          variant="outlined"
          sx={{
            mb: 2.5,
            borderRadius: 2.5,
            p: { xs: 1.75, sm: 2 },
            borderColor: 'divider',
            bgcolor: (t) => alpha(t.palette.background.paper, 0.94),
          }}
        >
          <SeasonTotalsStrip fight={fightParsed} />
        </Paper>
      ) : (
        <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2.5 }} variant="outlined">
          이 시즌·소환사에 대한 요약 분모 데이터가 아직 없어요. 서버 집계가 반영되면 여기 요약 숫자가 표시됩니다.
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.65 }}>
        픽률·승률 등은 해당 시즌에 수집·반영된 RTA 리플레이를 기준으로 계산된 값입니다.
      </Typography>

      {rawRows.length === 0 ? (
        <StatsEmptyState title="표시할 몬스터가 없습니다" description="해당 시즌 스냅이 비어 있을 수 있습니다." />
      ) : isNarrow ? (
        <Stack spacing={1.5}>
          {rawRows.map((row, idx) => {
            const open = expandedUnitId === row.unit_master_id;
            const slotBusy =
              open &&
              (breakdownFetching ||
                (breakdown != null && breakdown.unitMasterId !== row.unit_master_id));
            return (
              <PlayerPickStatCard
                key={row.unit_master_id}
                rank={idx + 1}
                row={row}
                expanded={open}
                onToggleExpand={() => toggleExpandedUnit(row.unit_master_id)}
                slotBreakdownLoading={Boolean(slotBusy)}
                slotBuckets={open ? breakdownRows : []}
                wizardId={wizardId}
                seasonCode={seasonCode}
                seasonId={seasonId}
              />
            );
          })}
        </Stack>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'auto',
          }}
        >
          <Table size="small" stickyHeader sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ ...TABLE_HEAD_CELL_SX, width: 52 }}>
                  #
                </TableCell>
                <TableCell align="left" sx={TABLE_HEAD_CELL_SX}>
                  몬스터
                </TableCell>
                <TableCell align="right" sx={TABLE_HEAD_CELL_SX}>
                  픽횟수
                </TableCell>
                <TableCell align="right" sx={TABLE_HEAD_CELL_SX}>
                  픽률
                </TableCell>
                <TableCell align="right" sx={TABLE_HEAD_CELL_SX}>
                  승률
                </TableCell>
                <TableCell align="right" sx={TABLE_HEAD_CELL_SX}>
                  벤율
                </TableCell>
                <TableCell align="right" sx={TABLE_HEAD_CELL_SX}>
                  1번픽률
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rawRows.map((row, idx) => {
                const rank = idx + 1;
                const open = expandedUnitId === row.unit_master_id;
                const slotBusy =
                  open &&
                  (breakdownFetching ||
                    (breakdown != null && breakdown.unitMasterId !== row.unit_master_id));
                return (
                  <Fragment key={row.unit_master_id}>
                    <TableRow hover>
                      <TableCell align="center" sx={{ ...NUMERIC_CELL_SX, color: 'text.secondary', verticalAlign: 'middle' }}>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
                          <IconButton
                            size="small"
                            onClick={() => toggleExpandedUnit(row.unit_master_id)}
                            aria-expanded={open}
                            aria-label={open ? '슬롯 상세 접기' : '슬롯 상세 펼치기'}
                            sx={{ p: '4px', flexShrink: 0 }}
                          >
                            <ExpandMoreIcon
                              sx={{
                                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s',
                                fontSize: '1.35rem',
                              }}
                            />
                          </IconButton>
                          <Typography component="span" sx={{ fontWeight: 700, fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>
                            {rank}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ minWidth: 200, maxWidth: 300 }}>
                        <MonsterCell
                          name={row.monster_name ?? undefined}
                          image={row.monster_image ?? undefined}
                          elemental={row.monster_elemental ?? undefined}
                          monsterId={String(row.unit_master_id)}
                        />
                      </TableCell>
                      <TableCell align="right" sx={NUMERIC_CELL_SX}>
                        {toNum(row.actual_pick_cnt).toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={NUMERIC_CELL_SX}>
                        {row.pick_rate_pct == null ? '—' : formatPercentage(toNum(row.pick_rate_pct))}
                      </TableCell>
                      <TableCell align="right" sx={NUMERIC_CELL_SX}>
                        {row.win_rate_pct == null ? '—' : formatPercentage(toNum(row.win_rate_pct))}
                      </TableCell>
                      <TableCell align="right" sx={NUMERIC_CELL_SX}>
                        {row.ban_rate_pct == null ? '—' : formatPercentage(toNum(row.ban_rate_pct))}
                      </TableCell>
                      <TableCell align="right" sx={NUMERIC_CELL_SX}>
                        {row.first_pick_rate_pct == null ? '—' : formatPercentage(toNum(row.first_pick_rate_pct))}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={7} sx={{ p: 0, verticalAlign: 'top' }}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                          <Box sx={{ px: 2.5, py: 2, bgcolor: alpha(theme.palette.action.hover, theme.palette.mode === 'dark' ? 0.22 : 0.1) }}>
                            <MonsterPickSlotBreakdownBlock
                              loading={Boolean(slotBusy)}
                              rows={open ? breakdownRows : []}
                              wizardId={wizardId}
                              seasonCode={seasonCode}
                              seasonId={seasonId}
                              unitMasterId={row.unit_master_id}
                            />
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}
