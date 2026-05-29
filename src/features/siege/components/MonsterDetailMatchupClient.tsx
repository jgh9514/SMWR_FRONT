'use client';

import { memo, useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import SwordsIcon from '@mui/icons-material/SportsMartialArts';
import { useMonsterInfoContext } from '@/features/siege/context/MonsterInfoContext';
import { useMonsterDetailLinkPrefetch } from '@/features/siege/hooks/useMonsterInfo';
import RtaSeasonTierSelectRow from '@/features/rta/components/RtaSeasonTierSelectRow';
import {
  useRtaSeasons,
  useRtaSeasonSelect,
  useRtaRatingGradeRules,
  useRtaCounterMatchup,
  buildMonsterStatsTierBody,
} from '@/features/rta/hooks/useRtaData';
import { getRtaTierShortLabel } from '@/shared/utils/util';
import { getRenderableImageUrl } from '@/shared/utils/image';
import type { CounterMatchupRow } from '@/features/rta/types/rta';
import { counterMatchupMatchCnt, sortCounterMatchupsByMatchCntDesc } from '@/features/rta/utils/counterMatchupSort';

const DISPLAY_LIMIT = 30;
const LOW_SAMPLE_THRESHOLD = 30;

const COMBO_TABS = [
  { key: 0, label: '솔로', size: 1 as const, icon: PersonIcon },
  { key: 1, label: '듀오', size: 2 as const, icon: GroupsIcon },
  { key: 2, label: '트리오', size: 3 as const, icon: Diversity3Icon },
] as const;

function fmtWinRate(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return `${Number(value).toFixed(1)}%`;
}

function winRateColor(value: number | null | undefined): 'success.main' | 'error.main' | 'text.secondary' {
  if (value == null || !Number.isFinite(Number(value))) return 'text.secondary';
  return Number(value) >= 50 ? 'success.main' : 'error.main';
}

const MatchupWinRateBar = memo(function MatchupWinRateBar({
  wins,
  total,
  compact = false,
}: {
  wins: number;
  total: number;
  compact?: boolean;
}) {
  const losses = Math.max(0, total - wins);
  const pct = total > 0 ? (wins / total) * 100 : 0;

  if (total <= 0) {
    return (
      <Typography variant="caption" color="text.disabled" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        —
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: compact ? 0.75 : 1, minWidth: 0, width: '100%' }}>
      <Typography
        variant="caption"
        fontWeight={700}
        color={winRateColor(pct)}
        sx={{ flexShrink: 0, minWidth: 40, fontVariantNumeric: 'tabular-nums' }}
      >
        {pct.toFixed(1)}%
      </Typography>
      <Box
        sx={{
          flex: 1,
          height: compact ? 6 : 8,
          borderRadius: 99,
          overflow: 'hidden',
          bgcolor: (t) => alpha(t.palette.error.main, 0.35),
          display: 'flex',
          minWidth: 48,
        }}
      >
        <Box
          sx={{
            width: `${pct}%`,
            bgcolor: 'success.main',
            transition: 'width 0.35s ease',
          }}
        />
      </Box>
      {!compact && (
        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
          {wins}승 · {losses}패
        </Typography>
      )}
    </Box>
  );
});

function MonsterAvatarLink({
  monsterId,
  image,
  name,
  size = 40,
}: {
  monsterId: string;
  image?: string | null;
  name: string;
  size?: number;
}) {
  const prefetchMonsterDetailLink = useMonsterDetailLinkPrefetch();
  const href = `/monster-detail/${monsterId}`;

  return (
    <Tooltip title={name} arrow placement="top">
      <Box
        component={Link}
        href={href}
        onMouseEnter={() => prefetchMonsterDetailLink(monsterId, href)}
        sx={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.25,
          textDecoration: 'none',
          color: 'inherit',
          minWidth: 0,
          maxWidth: size + 24,
          '&:hover .matchup-monster-avatar': {
            borderColor: 'primary.light',
            transform: 'scale(1.05)',
          },
        }}
      >
        <Avatar
          className="matchup-monster-avatar"
          src={getRenderableImageUrl(image)}
          alt={name}
          variant="rounded"
          sx={{
            width: size,
            height: size,
            border: '1px solid',
            borderColor: 'divider',
            transition: 'transform 0.15s, border-color 0.15s',
          }}
        >
          {name.charAt(0)}
        </Avatar>
        <Typography
          variant="caption"
          noWrap
          sx={{ maxWidth: '100%', fontSize: '0.62rem', lineHeight: 1.2, color: 'text.secondary' }}
        >
          {name}
        </Typography>
      </Box>
    </Tooltip>
  );
}

const OpponentCombo = memo(function OpponentCombo({
  row,
  avatarSize = 40,
}: {
  row: CounterMatchupRow;
  avatarSize?: number;
}) {
  const monsters = row.opponentMonsters ?? [];
  if (!monsters.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        {row.opponentLabel ?? row.opponentComboKey ?? '—'}
      </Typography>
    );
  }

  return (
    <Stack direction="row" alignItems="flex-start" flexWrap="wrap" gap={0.5} useFlexGap>
      {monsters.map((m, mi) => (
        <Stack key={m.monsterId} direction="row" alignItems="center" spacing={0.5}>
          {mi > 0 && (
            <Typography aria-hidden="true" variant="caption" color="text.disabled" sx={{ px: 0.15, userSelect: 'none' }}>
              +
            </Typography>
          )}
          <MonsterAvatarLink
            monsterId={m.monsterId}
            image={m.monsterImage}
            name={m.monsterName}
            size={avatarSize}
          />
        </Stack>
      ))}
    </Stack>
  );
});

function MatchupSummaryChips({ rows }: { rows: CounterMatchupRow[] }) {
  const stats = useMemo(() => {
    const displayed = rows.slice(0, DISPLAY_LIMIT);
    const totalMatches = displayed.reduce((sum, r) => sum + counterMatchupMatchCnt(r), 0);
    const reliable = displayed.filter((r) => counterMatchupMatchCnt(r) >= LOW_SAMPLE_THRESHOLD);
    let best: CounterMatchupRow | null = null;
    let worst: CounterMatchupRow | null = null;
    for (const r of reliable) {
      const wr = r.winRate != null ? Number(r.winRate) : null;
      if (wr == null || !Number.isFinite(wr)) continue;
      if (!best || wr > Number(best.winRate)) best = r;
      if (!worst || wr < Number(worst.winRate)) worst = r;
    }
    return { count: displayed.length, totalMatches, best, worst };
  }, [rows]);

  if (!stats.count) return null;

  const bestLabel = stats.best?.opponentMonsters?.map((m) => m.monsterName).join(' + ') ?? stats.best?.opponentLabel;
  const worstLabel = stats.worst?.opponentMonsters?.map((m) => m.monsterName).join(' + ') ?? stats.worst?.opponentLabel;

  return (
    <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap sx={{ mb: 2 }}>
      <Chip
        size="small"
        variant="outlined"
        label={`상위 ${stats.count}개 조합 · ${stats.totalMatches.toLocaleString()}경기`}
        sx={{ fontWeight: 600 }}
      />
      {stats.best && (
        <Chip
          size="small"
          color="success"
          variant="outlined"
          label={`유리 ${fmtWinRate(stats.best.winRate)} · ${bestLabel ?? '—'}`}
          sx={{ maxWidth: { xs: '100%', sm: 280 }, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
        />
      )}
      {stats.worst && stats.worst !== stats.best && (
        <Chip
          size="small"
          color="error"
          variant="outlined"
          label={`불리 ${fmtWinRate(stats.worst.winRate)} · ${worstLabel ?? '—'}`}
          sx={{ maxWidth: { xs: '100%', sm: 280 }, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
        />
      )}
    </Stack>
  );
}

function MatchupRowCard({ row, rank }: { row: CounterMatchupRow; rank: number }) {
  const matchCnt = counterMatchupMatchCnt(row);
  const wins = row.winCnt ?? 0;
  const wr = row.winRate != null && Number.isFinite(Number(row.winRate)) ? Number(row.winRate) : null;
  const lowSample = matchCnt > 0 && matchCnt < LOW_SAMPLE_THRESHOLD;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderRadius: 2,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: (t) => `0 4px 16px ${alpha(t.palette.common.black, 0.06)}`,
        },
      }}
    >
      <Stack spacing={1.25}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Typography
            variant="caption"
            fontWeight={800}
            color="text.disabled"
            sx={{ minWidth: 22, pt: 0.25, fontVariantNumeric: 'tabular-nums' }}
          >
            #{rank}
          </Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <OpponentCombo row={row} avatarSize={44} />
          </Box>
          <Stack alignItems="flex-end" spacing={0.25} flexShrink={0}>
            <Typography variant="body2" fontWeight={700} color={winRateColor(wr)} sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {fmtWinRate(wr)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {matchCnt > 0 ? `${matchCnt.toLocaleString()}경기` : '—'}
            </Typography>
          </Stack>
        </Stack>
        <MatchupWinRateBar wins={wins} total={matchCnt} />
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={0.5}>
          <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {wins}승 / {row.loseCnt ?? 0}패
          </Typography>
          {lowSample && (
            <Chip size="small" label="표본 적음" variant="outlined" color="warning" sx={{ height: 22, fontSize: '0.65rem' }} />
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

function MatchupTableRow({ row, rank }: { row: CounterMatchupRow; rank: number }) {
  const matchCnt = counterMatchupMatchCnt(row);
  const wins = row.winCnt ?? 0;
  const lowSample = matchCnt > 0 && matchCnt < LOW_SAMPLE_THRESHOLD;

  return (
    <Box
      component="tr"
      sx={{
        display: 'table-row',
        '&:hover td': { bgcolor: 'action.hover' },
      }}
    >
      <Box component="td" sx={{ display: 'table-cell', py: 1.25, px: 1.5, width: 44, verticalAlign: 'middle' }}>
        <Typography variant="caption" fontWeight={800} color="text.disabled" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          #{rank}
        </Typography>
      </Box>
      <Box component="td" sx={{ display: 'table-cell', py: 1.25, px: 1.5, verticalAlign: 'middle', minWidth: 160 }}>
        <OpponentCombo row={row} avatarSize={36} />
      </Box>
      <Box
        component="td"
        align="right"
        sx={{ display: 'table-cell', py: 1.25, px: 1.5, verticalAlign: 'middle', whiteSpace: 'nowrap' }}
      >
        <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.75}>
          <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {matchCnt > 0 ? matchCnt.toLocaleString() : '—'}
          </Typography>
          {lowSample && (
            <Tooltip title={`${LOW_SAMPLE_THRESHOLD}경기 미만 — 참고용`} arrow>
              <Chip size="small" label="!" color="warning" variant="outlined" sx={{ height: 20, minWidth: 20, '& .MuiChip-label': { px: 0.5 } }} />
            </Tooltip>
          )}
        </Stack>
      </Box>
      <Box component="td" sx={{ display: 'table-cell', py: 1.25, px: 1.5, verticalAlign: 'middle', minWidth: 200 }}>
        <MatchupWinRateBar wins={wins} total={matchCnt} />
      </Box>
      <Box
        component="td"
        align="right"
        sx={{ display: 'table-cell', py: 1.25, px: 1.5, verticalAlign: 'middle', whiteSpace: 'nowrap' }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {wins} / {row.loseCnt ?? 0}
        </Typography>
      </Box>
    </Box>
  );
}

function MatchupListSkeleton({ cardMode }: { cardMode: boolean }) {
  if (cardMode) {
    return (
      <Stack spacing={1.5}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 2 }} />
        ))}
      </Stack>
    );
  }
  return (
    <Stack spacing={0.5}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={56} />
      ))}
    </Stack>
  );
}

function MatchupEmptyState({ comboLabel }: { comboLabel: string }) {
  return (
    <Card variant="outlined" sx={{ borderStyle: 'dashed', bgcolor: 'action.hover' }}>
      <CardContent sx={{ py: 5, textAlign: 'center' }}>
        <SwordsIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} aria-hidden />
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {comboLabel} 상성 데이터 없음
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mx: 'auto', lineHeight: 1.65 }}>
          선택한 시즌·티어에서 이 몬스터와 맞붙은 {comboLabel} 조합 기록이 없습니다. 시즌이나 티어를 바꿔 보세요.
        </Typography>
      </CardContent>
    </Card>
  );
}

function MatchupPanel({
  rows,
  isLoading,
  isFetching,
  isError,
  comboLabel,
}: {
  rows: CounterMatchupRow[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  comboLabel: string;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const sortedRows = useMemo(() => sortCounterMatchupsByMatchCntDesc(rows), [rows]);
  const displayed = useMemo(() => sortedRows.slice(0, DISPLAY_LIMIT), [sortedRows]);

  if (isLoading) return <MatchupListSkeleton cardMode={isMobile} />;
  if (isError) {
    return (
      <Alert severity="warning" sx={{ mt: 1 }}>
        상성 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </Alert>
    );
  }
  if (!displayed.length) return <MatchupEmptyState comboLabel={comboLabel} />;

  return (
    <Box sx={{ position: 'relative' }}>
      {isFetching && !isLoading && (
        <LinearProgress sx={{ position: 'absolute', top: -8, left: 0, right: 0, borderRadius: 1 }} />
      )}

      <MatchupSummaryChips rows={sortedRows} />

      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
        경기 수 많은 순 · 상위 {DISPLAY_LIMIT}개
        {displayed.some((r) => counterMatchupMatchCnt(r) < LOW_SAMPLE_THRESHOLD) &&
          ` · ${LOW_SAMPLE_THRESHOLD}경기 미만은 참고용`}
      </Typography>

      {isMobile ? (
        <Stack spacing={1.5}>
          {displayed.map((r, i) => (
            <MatchupRowCard key={`${r.opponentComboKey}-${i}`} row={r} rank={i + 1} />
          ))}
        </Stack>
      ) : (
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'auto',
            maxHeight: 'min(70vh, 640px)',
          }}
        >
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <Box
              component="thead"
              sx={{
                position: 'sticky',
                top: 0,
                zIndex: 1,
                bgcolor: 'background.paper',
                boxShadow: (t) => `0 1px 0 ${t.palette.divider}`,
              }}
            >
              <Box component="tr" sx={{ display: 'table-row' }}>
                {['#', '상대 조합', '경기수', '승률', '승 / 패'].map((h, i) => (
                  <Box
                    key={h}
                    component="th"
                    align={i >= 2 ? 'right' : 'left'}
                    sx={{
                      display: 'table-cell',
                      py: 1.25,
                      px: 1.5,
                      typography: 'caption',
                      fontWeight: 700,
                      color: 'text.secondary',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {displayed.map((r, i) => (
                <MatchupTableRow key={`${r.opponentComboKey}-${i}`} row={r} rank={i + 1} />
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default function MonsterDetailMatchupClient() {
  const { monsterInfo } = useMonsterInfoContext();

  const rtaMonsterNumericId = useMemo(() => {
    const n = Number.parseInt(String(monsterInfo.monster_id), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [monsterInfo.monster_id]);

  const { data: seasonsData } = useRtaSeasons();
  const { seasonSelectValue, setSeason, seasonOptions, seasonIdForApi } = useRtaSeasonSelect(seasonsData);
  const { data: gradeRules = [], isLoading: tierRulesLoading } = useRtaRatingGradeRules();
  const [tierSelection, setTierSelection] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [visitedTabs, setVisitedTabs] = useState<Set<number>>(() => new Set([0]));

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  useEffect(() => {
    if (gradeRules.length > 0 && !tierSelection) {
      const rule = gradeRules.find((r) => r.ratingId === 4003) ?? gradeRules[0];
      setTierSelection(getRtaTierShortLabel(rule.ratingId));
    }
  }, [gradeRules, tierSelection]);

  const ratingId = useMemo(() => {
    if (!tierSelection) return null;
    const body = buildMonsterStatsTierBody(tierSelection, gradeRules);
    return body.ratingId ?? null;
  }, [tierSelection, gradeRules]);

  const sid = seasonIdForApi ?? null;

  const soloQuery = useRtaCounterMatchup(rtaMonsterNumericId, sid, ratingId, 1, visitedTabs.has(0));
  const duoQuery = useRtaCounterMatchup(rtaMonsterNumericId, sid, ratingId, 2, visitedTabs.has(1));
  const trioQuery = useRtaCounterMatchup(rtaMonsterNumericId, sid, ratingId, 3, visitedTabs.has(2));

  const queries = [soloQuery, duoQuery, trioQuery] as const;

  const handleTabChange = useCallback((_: MouseEvent<HTMLElement>, v: number | null) => {
    if (v != null) setActiveTab(v);
  }, []);

  const activeCombo = COMBO_TABS[activeTab];

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5 }}>
          RTA 상대 상성
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65, maxWidth: 560 }}>
          {monsterInfo.kr_name}이(가) 포함된 덱과 맞붙은 상대 {activeCombo.label} 조합별 승률입니다. 픽·밴 전략 참고용으로 활용하세요.
        </Typography>
      </Box>

      <RtaSeasonTierSelectRow
        seasonSelectValue={seasonSelectValue}
        setSeason={setSeason}
        seasonOptions={seasonOptions}
        tierSelection={tierSelection}
        setTierSelection={setTierSelection}
        gradeRules={gradeRules}
        tierRulesLoading={tierRulesLoading}
        seasonLabelId="monster-detail-matchup-season"
        hideBulkTierOptions
        mb={0}
      />

      <ToggleButtonGroup
        exclusive
        value={activeTab}
        onChange={handleTabChange}
        size="small"
        sx={{
          display: 'flex',
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          gap: 1,
          '& .MuiToggleButtonGroup-grouped': {
            flex: { xs: '1 1 calc(33% - 8px)', sm: '1 1 0' },
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '8px !important',
            mx: '0 !important',
            py: 1,
            textTransform: 'none',
            fontWeight: 600,
            '&.Mui-selected': {
              bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.18) },
            },
          },
        }}
      >
        {COMBO_TABS.map((tab, idx) => {
          const Icon = tab.icon;
          const count = queries[idx].data?.rows?.length ?? null;
          return (
            <ToggleButton key={tab.key} value={tab.key} aria-label={`${tab.label} 상성`}>
              <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap>
                <Icon sx={{ fontSize: 18 }} aria-hidden />
                <span>{tab.label}</span>
                {count != null && (
                  <Chip
                    size="small"
                    label={count}
                    sx={{
                      height: 20,
                      minWidth: 20,
                      '& .MuiChip-label': { px: 0.75, fontSize: '0.65rem', fontWeight: 700 },
                    }}
                  />
                )}
              </Stack>
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>

      <MatchupPanel
        rows={queries[activeTab].data?.rows ?? []}
        isLoading={queries[activeTab].isLoading}
        isFetching={queries[activeTab].isFetching}
        isError={queries[activeTab].isError}
        comboLabel={activeCombo.label}
      />
    </Stack>
  );
}
