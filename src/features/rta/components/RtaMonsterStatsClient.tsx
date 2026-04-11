'use client';

import { Fragment, useEffect, useMemo, useState, type ReactNode, type SyntheticEvent } from 'react';
import Link from 'next/link';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Container,
  Chip,
  Tabs,
  Tab,
  Paper,
  Stack,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
  Pagination,
  LinearProgress,
  Alert,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Button,
  Menu,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SortOutlinedIcon from '@mui/icons-material/SortOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { getRenderableImageUrl } from '@/shared/utils/image';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import AttributeElementIcon from '@/shared/ui/attribute-element-icon/AttributeElementIcon';
import type { AttributeType } from '@/features/siege/types/monster';
import type { DuoComboStat, MonsterStats, RtaRatingGradeRule, TrioComboStat } from '@/features/rta/types/rta';
import { useRtaMonsterStats, useRtaRatingGradeRules } from '@/features/rta/hooks/useRtaData';
import RtaRatingStarIcons from '@/features/rta/components/RtaRatingStarIcons';

type SortField =
  | 'pick_count'
  | 'pick_rate'
  | 'win_rate'
  | 'first_pick_rate'
  | 'ban_rate'
  | 'monster_name';
type SortOrder = 'asc' | 'desc';

type ComboSortField = 'match_count' | 'win_rate';

const PAGE_SIZE = 20;

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseElemental(raw?: string): AttributeType | null {
  if (!raw) return null;
  const k = String(raw).trim().toLowerCase();
  if (k === 'fire' || k === 'water' || k === 'wind' || k === 'light' || k === 'dark') {
    return k;
  }
  return null;
}

function normalizeDuo(row: DuoComboStat): DuoComboStat {
  return {
    ...row,
    match_count: toNum(row.match_count),
    win_rate: toNum(row.win_rate),
  };
}

function normalizeTrio(row: TrioComboStat): TrioComboStat {
  return {
    ...row,
    match_count: toNum(row.match_count),
    win_rate: toNum(row.win_rate),
  };
}

/** WAS Map JSON 이 스네이크/카멜 혼재일 수 있음 — 누락 시 UI 에서 charAt 등으로 런타임 크래시 방지 */
function normalizeMonsterStat(raw: MonsterStats): MonsterStats {
  const r = raw as unknown as Record<string, unknown>;
  const nameRaw = r.monster_name ?? r.monsterName;
  const name = nameRaw != null && String(nameRaw).trim() !== '' ? String(nameRaw).trim() : '—';
  const id = r.monster_id ?? r.monsterId;
  return {
    ...raw,
    monster_name: name,
    monster_id: id != null && String(id).trim() !== '' ? String(id) : undefined,
    monster_elemental: (raw.monster_elemental ?? r.monsterElemental) as string | undefined,
    monster_image: (raw.monster_image ?? r.monsterImage) as string | undefined,
    pick_count: toNum(raw.pick_count ?? r.pickCount),
    pick_rate: toNum(raw.pick_rate ?? r.pickRate),
    win_rate: toNum(raw.win_rate ?? r.winRate),
    first_pick_rate: toNum(raw.first_pick_rate ?? r.firstPickRate),
    ban_rate: toNum(raw.ban_rate ?? r.banRate),
  };
}

/**
 * MyBatis mapUnderscoreToCamelCase + Map 결과 시 `monster_image_3` → `monsterImage3` 등으로 올 수 있어
 * 스네이크/카멜·언더스코어 유무 조합을 모두 허용한다.
 */
function pickDuoMonsterImage(row: DuoComboStat, slot: 1 | 2): string | undefined {
  const r = row as unknown as Record<string, unknown>;
  const keys = [`monster_image_${slot}`, `monsterImage${slot}`, `monster_image${slot}`] as const;
  for (const k of keys) {
    const v = r[k];
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return undefined;
}

function pickTrioMonsterImage(row: TrioComboStat, slot: 1 | 2 | 3): string | undefined {
  const r = row as unknown as Record<string, unknown>;
  const keys = [`monster_image_${slot}`, `monsterImage${slot}`, `monster_image${slot}`] as const;
  for (const k of keys) {
    const v = r[k];
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return undefined;
}

function MonsterCell({
  name,
  image,
  elemental,
  monsterId,
}: {
  name?: string;
  image?: string;
  elemental?: string;
  monsterId?: string;
}) {
  const attr = parseElemental(elemental);
  const displayName = name?.trim() || '—';
  const href = monsterId ? `/rta/monster-stats/${monsterId}` : undefined;

  const inner = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minWidth: 0,
        width: '100%',
        maxWidth: '100%',
      }}
    >
      <Avatar
        src={getRenderableImageUrl(image)}
        alt={displayName}
        variant="rounded"
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {displayName.charAt(0)}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
        <Typography variant="body2" fontWeight={600} noWrap title={displayName}>
          {displayName}
        </Typography>
        {attr && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
            <AttributeElementIcon attribute={attr} size={16} />
          </Box>
        )}
      </Box>
    </Box>
  );

  if (href) {
    return (
      <Box
        component={Link}
        href={href}
        sx={{
          textDecoration: 'none',
          color: 'inherit',
          borderRadius: 1,
          px: 0.5,
          mx: -0.5,
          minWidth: 0,
          width: '100%',
          maxWidth: '100%',
          display: 'block',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        {inner}
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      {inner}
    </Box>
  );
}

/** 레전드 구간(L1 등) — 티어 메뉴에서 제외 */
function isLegendTierKey(tierKey: string): boolean {
  const k = tierKey.trim();
  return k.length > 0 && k[0] === 'L';
}

const TIER_MENU_BLOCKS = [
  { slots: ['Ch1', 'Ch2', 'Ch3'] as const, allKey: 'CH_ALL', allLabel: 'Ch 전체' },
  { slots: ['F1', 'F2', 'F3'] as const, allKey: 'F_ALL', allLabel: 'F 전체' },
  { slots: ['C1', 'C2', 'C3'] as const, allKey: 'C_ALL', allLabel: 'C 전체' },
  { slots: ['P1', 'P2', 'P3'] as const, allKey: 'P_ALL', allLabel: 'P 전체' },
  { slots: ['G1', 'G2', 'G3'] as const, allKey: 'G_ALL', allLabel: 'G 전체' },
] as const;

const BULK_TIER_LABEL: Record<string, string> = {
  CH_ALL: 'Ch 전체',
  F_ALL: 'F 전체',
  C_ALL: 'C 전체',
  P_ALL: 'P 전체',
  G_ALL: 'G 전체',
};

function tierRuleMap(rules: RtaRatingGradeRule[]): Map<string, RtaRatingGradeRule> {
  return new Map(rules.map((r) => [r.tierKey, r]));
}

function tierSelectionSummary(value: string, byTier: Map<string, RtaRatingGradeRule>): ReactNode {
  if (!value) {
    return '전체 티어 합산';
  }
  const bulk = BULK_TIER_LABEL[value];
  if (bulk) {
    return bulk;
  }
  const r = byTier.get(value);
  return (
    <Stack direction="row" alignItems="center" gap={1} component="span">
      {r ? <RtaRatingStarIcons rating={r.ratingId} size={16} gap={1} /> : null}
      <Typography component="span" variant="body2" fontWeight={600}>
        {r?.gradeName?.trim() ? `${r.gradeName} (${value})` : value}
      </Typography>
    </Stack>
  );
}

function MonsterTierMenu({
  value,
  onChange,
  rules,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  rules: RtaRatingGradeRule[];
  disabled?: boolean;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const visibleRules = useMemo(() => rules.filter((r) => !isLegendTierKey(r.tierKey)), [rules]);
  const byTier = useMemo(() => tierRuleMap(visibleRules), [visibleRules]);

  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <Button
        type="button"
        variant="outlined"
        color="inherit"
        disabled={disabled}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        endIcon={<KeyboardArrowDownIcon sx={{ opacity: 0.7 }} />}
        sx={{
          justifyContent: 'space-between',
          textAlign: 'left',
          py: 1,
          px: 1.5,
          minWidth: { xs: '100%', sm: 280 },
          maxWidth: '100%',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ minWidth: 0, overflow: 'hidden' }}>{tierSelectionSummary(value, byTier)}</Box>
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              maxWidth: 'min(100vw - 24px, 440px)',
              width: '100%',
            },
          },
        }}
      >
        <Box sx={{ px: 1.5, pb: 1.5, pt: 0.5 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 0.75,
            }}
          >
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Button
                fullWidth
                size="small"
                variant={value === '' ? 'contained' : 'outlined'}
                onClick={() => {
                  onChange('');
                  handleClose();
                }}
              >
                전체 티어 합산
              </Button>
            </Box>

            {TIER_MENU_BLOCKS.map((block) => (
              <Fragment key={block.allKey}>
                {block.slots.map((k) => {
                  const r = byTier.get(k);
                  return (
                    <Button
                      key={k}
                      size="small"
                      variant={value === k ? 'contained' : 'outlined'}
                      disabled={!r}
                      onClick={() => {
                        if (r) onChange(k);
                        handleClose();
                      }}
                      sx={{
                        minHeight: 56,
                        flexDirection: 'column',
                        gap: 0.25,
                        py: 0.75,
                        fontSize: '0.7rem',
                        lineHeight: 1.2,
                      }}
                    >
                      {r ? <RtaRatingStarIcons rating={r.ratingId} size={14} gap={1} /> : null}
                      {k}
                    </Button>
                  );
                })}
                <Button
                  size="small"
                  variant={value === block.allKey ? 'contained' : 'outlined'}
                  onClick={() => {
                    onChange(block.allKey);
                    handleClose();
                  }}
                  sx={{
                    minHeight: 56,
                    flexDirection: 'column',
                    justifyContent: 'center',
                    py: 0.75,
                    fontSize: '0.7rem',
                  }}
                >
                  {block.allLabel}
                </Button>
              </Fragment>
            ))}
          </Box>
        </Box>
      </Menu>
    </>
  );
}

function StatsEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card variant="outlined" sx={{ borderStyle: 'dashed', bgcolor: 'action.hover' }}>
      <CardContent sx={{ py: { xs: 5, md: 6 }, px: { xs: 2, md: 3 } }}>
        <Stack alignItems="center" spacing={2} textAlign="center" maxWidth={440} mx="auto">
          <BarChartOutlinedIcon sx={{ fontSize: 44, color: 'text.disabled', opacity: 0.9 }} aria-hidden />
          <Typography variant="subtitle1" fontWeight={700} component="p">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
            {description}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function RtaMonsterStatsClient() {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));

  const [tierKey, setTierKey] = useState('');
  const [statsPage, setStatsPage] = useState(1);
  const [duoPage, setDuoPage] = useState(1);
  const [trioPage, setTrioPage] = useState(1);

  const statsOffset = (statsPage - 1) * PAGE_SIZE;
  const duoOffset = (duoPage - 1) * PAGE_SIZE;
  const trioOffset = (trioPage - 1) * PAGE_SIZE;

  const { data: gradeRules = [], isLoading: tierRulesLoading } = useRtaRatingGradeRules();

  const { data, isLoading, isFetching, error } = useRtaMonsterStats({
    limit: PAGE_SIZE,
    statsOffset,
    duoOffset,
    trioOffset,
    tierKey: tierKey || null,
  });

  useEffect(() => {
    setStatsPage(1);
    setDuoPage(1);
    setTrioPage(1);
  }, [tierKey]);

  const statsIn = data?.stats ?? [];
  const duoStatsRaw = data?.duo_stats ?? [];
  const trioStatsRaw = data?.trio_stats ?? [];
  const totalMatches = toNum(data?.total_matches);
  const statsTotal = toNum(data?.stats_total);
  const duoTotal = toNum(data?.duo_total);
  const trioTotal = toNum(data?.trio_total);

  const stats = useMemo(() => statsIn.map(normalizeMonsterStat), [statsIn]);

  const [tab, setTab] = useState(0);
  const [sortField, setSortField] = useState<SortField>('pick_count');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [duoSortField, setDuoSortField] = useState<ComboSortField>('match_count');
  const [duoSortOrder, setDuoSortOrder] = useState<SortOrder>('desc');
  const [trioSortField, setTrioSortField] = useState<ComboSortField>('match_count');
  const [trioSortOrder, setTrioSortOrder] = useState<SortOrder>('desc');

  const duoStats = useMemo(() => duoStatsRaw.map(normalizeDuo), [duoStatsRaw]);
  const trioStats = useMemo(() => trioStatsRaw.map(normalizeTrio), [trioStatsRaw]);

  const sortedStats = useMemo(() => {
    if (stats.length === 0) return [];

    return [...stats].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'monster_name':
          aValue = a.monster_name;
          bValue = b.monster_name;
          break;
        case 'pick_count':
          aValue = toNum(a.pick_count);
          bValue = toNum(b.pick_count);
          break;
        case 'pick_rate':
          aValue = toNum(a.pick_rate);
          bValue = toNum(b.pick_rate);
          break;
        case 'win_rate':
          aValue = toNum(a.win_rate);
          bValue = toNum(b.win_rate);
          break;
        case 'first_pick_rate':
          aValue = toNum(a.first_pick_rate);
          bValue = toNum(b.first_pick_rate);
          break;
        case 'ban_rate':
          aValue = toNum(a.ban_rate);
          bValue = toNum(b.ban_rate);
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      const numA = Number(aValue);
      const numB = Number(bValue);

      return sortOrder === 'asc' ? numA - numB : numB - numA;
    });
  }, [sortField, sortOrder, stats]);

  const sortedDuo = useMemo(() => {
    if (duoStats.length === 0) return [];
    return [...duoStats].sort((a, b) => {
      const av = duoSortField === 'match_count' ? a.match_count : a.win_rate;
      const bv = duoSortField === 'match_count' ? b.match_count : b.win_rate;
      return duoSortOrder === 'asc' ? av - bv : bv - av;
    });
  }, [duoStats, duoSortField, duoSortOrder]);

  const sortedTrio = useMemo(() => {
    if (trioStats.length === 0) return [];
    return [...trioStats].sort((a, b) => {
      const av = trioSortField === 'match_count' ? a.match_count : a.win_rate;
      const bv = trioSortField === 'match_count' ? b.match_count : b.win_rate;
      return trioSortOrder === 'asc' ? av - bv : bv - av;
    });
  }, [trioStats, trioSortField, trioSortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortOrder('desc');
  };

  const handleDuoToggle = (_: SyntheticEvent, value: ComboSortField | null) => {
    if (value === null) return;
    if (value !== duoSortField) {
      setDuoSortField(value);
      setDuoSortOrder('desc');
    }
  };

  const handleTrioToggle = (_: SyntheticEvent, value: ComboSortField | null) => {
    if (value === null) return;
    if (value !== trioSortField) {
      setTrioSortField(value);
      setTrioSortOrder('desc');
    }
  };

  const flipDuoOrder = () => setDuoSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
  const flipTrioOrder = () => setTrioSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));

  const formatPercentage = (value: number) => `${toNum(value).toFixed(2)}%`;

  const sortChipSx = (selected: boolean) => ({
    height: 30,
    fontWeight: selected ? 600 : 450,
    cursor: 'pointer',
    transition: 'background-color 0.2s, border-color 0.2s',
    '&:hover': {
      borderColor: 'primary.light',
    },
  });

  const tableHeadSx = {
    '& .MuiTableCell-head': {
      fontWeight: 700,
      fontSize: '0.8125rem',
      letterSpacing: '0.02em',
      bgcolor: 'action.hover',
      borderBottom: '2px solid',
      borderColor: 'divider',
      whiteSpace: 'nowrap' as const,
    },
  };

  const numericCellSx = { fontVariantNumeric: 'tabular-nums' as const };

  const soloSortFields: SortField[] = [
    'monster_name',
    'pick_count',
    'pick_rate',
    'win_rate',
    'first_pick_rate',
    'ban_rate',
  ];

  const soloLabels: Record<SortField, string> = {
    monster_name: '몬스터',
    pick_count: '픽횟수',
    pick_rate: '픽률',
    win_rate: '승률',
    first_pick_rate: '선픽율',
    ban_rate: '벤율',
  };

  if (isLoading && data === undefined) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
        <PageHeader title="RTA 몬스터별 통계" />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 280 }}>
          <CircularProgress aria-label="통계 불러오는 중" />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
      {isFetching && (
        <LinearProgress
          sx={{ position: 'sticky', top: 0, zIndex: (t) => t.zIndex.appBar - 1, mb: 1 }}
          aria-busy="true"
        />
      )}
      <PageHeader title="RTA 몬스터별 통계" />
      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          통계를 최신으로 가져오지 못했습니다. 새로고침하거나 잠시 후 다시 시도해 주세요.
        </Alert>
      )}
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: -2, mb: 3, maxWidth: 720, lineHeight: 1.65 }}
      >
        시즌 기준 픽·승 통계와 필드 조합(듀오·트리오)을 한 화면에서 비교합니다. 탭마다 정렬 기준을 바꿔 볼 수
        있습니다.
      </Typography>

      <Box sx={{ mb: 2, maxWidth: { sm: 480 } }}>
        <MonsterTierMenu
          value={tierKey}
          onChange={setTierKey}
          rules={gradeRules}
          disabled={tierRulesLoading}
        />
      </Box>

      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: { xs: 2, md: 2.75 },
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          background: (t) =>
            t.palette.mode === 'dark'
              ? `linear-gradient(145deg, ${t.palette.primary.dark}18 0%, ${t.palette.background.paper} 55%)`
              : `linear-gradient(145deg, ${t.palette.primary.light}28 0%, ${t.palette.background.paper} 50%)`,
        }}
      >
        <Stack direction="row" gap={1.5} alignItems="flex-start" sx={{ mb: 2 }}>
          <InfoOutlinedIcon color="info" sx={{ mt: 0.25, flexShrink: 0, opacity: 0.9 }} aria-hidden />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              집계 방식
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, maxWidth: 800 }}>
              <strong>솔로</strong>는 몬스터 1마리 기준입니다. <strong>듀오·트리오</strong>는 5픽 중{' '}
              <strong>벤된 슬롯을 제외</strong>한 필드 4마리로만 조합을 냅니다. 팀당 매치마다 2마리 쌍{' '}
              <strong>6개</strong>(C(4,2)), 3마리 묶음 <strong>4개</strong>(C(4,3))이며, 표에는 동일 조합이{' '}
              <strong>표본 100판 이상</strong>인 경우만 표시합니다.
            </Typography>
          </Box>
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" flexWrap="wrap" gap={1.5} alignItems="center">
          <Chip
            size="small"
            icon={<GroupsIcon sx={{ fontSize: '1rem !important' }} />}
            label={
              totalMatches > 0
                ? `집계 매치 ${totalMatches.toLocaleString()}건`
                : '매치 수 집계 중'
            }
            color="primary"
            variant="outlined"
          />
          <Typography variant="caption" color="text.secondary">
            서버 캐시로 수 분 단위 지연될 수 있습니다.
          </Typography>
        </Stack>
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          aria-label="몬스터 통계 보기 방식"
          sx={{
            minHeight: 52,
            '& .MuiTab-root': {
              minHeight: 52,
              fontWeight: 600,
              textTransform: 'none',
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
              gap: 0.75,
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab icon={<PersonIcon fontSize="small" />} iconPosition="start" label="솔로 (1마리)" />
          <Tab icon={<Diversity3Icon fontSize="small" />} iconPosition="start" label="듀오 (2마리)" />
          <Tab icon={<GroupsIcon fontSize="small" />} iconPosition="start" label="트리오 (3마리)" />
        </Tabs>
      </Box>

      {tab === 0 && (
        <>
          <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', px: 2, py: 1.75 }}>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
                  <SortOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary' }} aria-hidden />
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    정렬 기준
                  </Typography>
                </Stack>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'nowrap',
                    overflowX: 'auto',
                    pb: 0.25,
                    mx: { xs: -0.5, sm: 0 },
                    px: { xs: 0.5, sm: 0 },
                    '&::-webkit-scrollbar': { height: 6 },
                    '&::-webkit-scrollbar-thumb': {
                      borderRadius: 3,
                      bgcolor: 'action.disabledBackground',
                    },
                  }}
                >
                  {soloSortFields.map((field) => {
                    const isSelected = sortField === field;

                    return (
                      <Chip
                        key={field}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <span>{soloLabels[field]}</span>
                            {isSelected &&
                              (sortOrder === 'asc' ? (
                                <ArrowUpwardIcon sx={{ fontSize: '0.875rem' }} />
                              ) : (
                                <ArrowDownwardIcon sx={{ fontSize: '0.875rem' }} />
                              ))}
                          </Box>
                        }
                        onClick={() => handleSort(field)}
                        color={isSelected ? 'primary' : 'default'}
                        variant={isSelected ? 'filled' : 'outlined'}
                        size="small"
                        sx={{ ...sortChipSx(isSelected), flexShrink: 0 }}
                      />
                    );
                  })}
                </Box>
              </Stack>
          </Paper>

          {sortedStats.length === 0 ? (
            <StatsEmptyState
              title="표시할 통계가 없습니다"
              description="표본이 100판 미만인 몬스터는 목록에서 제외합니다. 리플레이가 부족하거나 집계가 아직 반영되지 않았을 수 있습니다. 잠시 후 다시 확인해 주세요."
            />
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {sortedStats.map((stat, index) => {
                const uniqueKey = stat.monster_id || stat.monster_name;
                const href = stat.monster_id ? `/rta/monster-stats/${stat.monster_id}` : undefined;

                return (
                  <Card
                    key={uniqueKey}
                    component={href ? Link : 'div'}
                    href={href}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      transition: 'all 0.3s ease',
                      cursor: href ? 'pointer' : 'default',
                      textDecoration: 'none',
                      '&:hover': href
                        ? {
                            boxShadow: 4,
                            transform: 'translateY(-2px)',
                            borderColor: 'primary.main',
                          }
                        : undefined,
                    }}
                  >
                    <CardContent
                      sx={{ p: { xs: 2, md: 2.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          gap: { xs: 2, md: 3 },
                          alignItems: 'stretch',
                          flexWrap: 'nowrap',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            flexShrink: 0,
                            width: 40,
                            minWidth: 40,
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="primary"
                            fontWeight={800}
                            sx={{ mb: 0.5 }}
                          >
                            #{statsOffset + index + 1}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            flexShrink: 0,
                            p: 1,
                            borderRadius: 2,
                            bgcolor: 'background.default',
                            width: { xs: 104, md: 124 },
                            minWidth: { xs: 104, md: 124 },
                            maxWidth: { xs: 104, md: 124 },
                            boxSizing: 'border-box',
                          }}
                        >
                          <Avatar
                            src={getRenderableImageUrl(stat.monster_image)}
                            alt={stat.monster_name ?? '—'}
                            sx={{
                              width: { xs: 70, md: 90 },
                              height: { xs: 70, md: 90 },
                              mb: 1.5,
                              flexShrink: 0,
                              boxShadow: 2,
                              border: '2px solid',
                              borderColor: 'divider',
                            }}
                            variant="rounded"
                          >
                            {(stat.monster_name ?? '—').charAt(0)}
                          </Avatar>
                          <Typography
                            variant="body2"
                            component="div"
                            title={stat.monster_name ?? '—'}
                            sx={{
                              fontWeight: 600,
                              textAlign: 'center',
                              lineHeight: 1.35,
                              color: 'text.primary',
                              width: '100%',
                              minHeight: '2.7em',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              wordBreak: 'break-word',
                            }}
                          >
                            {stat.monster_name}
                          </Typography>
                        </Box>

                        <Box
                          sx={{
                            flex: 1,
                            minWidth: 0,
                            alignSelf: 'stretch',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                            gap: { xs: 1.5, md: 2 },
                            alignContent: 'center',
                          }}
                        >
                          {[
                            {
                              label: '픽률',
                              value: `${toNum(stat.pick_count).toLocaleString()} (${formatPercentage(stat.pick_rate)})`,
                            },
                            { label: '승률', value: formatPercentage(stat.win_rate) },
                            { label: '선픽율', value: formatPercentage(stat.first_pick_rate) },
                            { label: '벤율', value: formatPercentage(stat.ban_rate) },
                          ].map((item) => (
                            <Box
                              key={item.label}
                              sx={{
                                p: { xs: 1.25, md: 1.5 },
                                borderRadius: 1.5,
                                bgcolor: 'action.hover',
                                border: '1px solid',
                                borderColor: 'divider',
                                transition: 'background-color 0.2s, border-color 0.2s',
                                '&:hover': {
                                  bgcolor: 'action.selected',
                                  borderColor: 'primary.light',
                                },
                              }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  display: 'block',
                                  mb: 0.75,
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                {item.label}
                              </Typography>
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 700,
                                  color: 'text.primary',
                                  lineHeight: 1.25,
                                  fontSize: { xs: '1rem', md: '1.2rem' },
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {item.value}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
          {statsTotal > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
              <Pagination
                count={Math.ceil(statsTotal / PAGE_SIZE)}
                page={statsPage}
                onChange={(_, p) => setStatsPage(p)}
                color="primary"
                showFirstButton
                showLastButton
                size={isNarrow ? 'small' : 'medium'}
                aria-label="솔로 통계 페이지"
              />
            </Box>
          )}
        </>
      )}

      {tab === 1 && (
        <>
          <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, px: 2, py: 1.75 }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', md: 'center' }}
                justifyContent="space-between"
              >
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <SortOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary' }} aria-hidden />
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      정렬 기준
                    </Typography>
                  </Stack>
                  <ToggleButtonGroup
                    exclusive
                    value={duoSortField}
                    onChange={handleDuoToggle}
                    size="small"
                    color="primary"
                    aria-label="듀오 조합 정렬"
                    sx={{
                      alignSelf: { xs: 'stretch', md: 'flex-start' },
                      '& .MuiToggleButton-root': {
                        px: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                      },
                    }}
                  >
                    <ToggleButton value="match_count">표본(경기 수)</ToggleButton>
                    <ToggleButton value="win_rate">승률</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ alignSelf: { md: 'center' }, flexWrap: 'wrap' }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {duoSortOrder === 'desc' ? '높은 값 먼저' : '낮은 값 먼저'}
                  </Typography>
                  <Tooltip title="오름차순 ↔ 내림차순">
                    <IconButton
                      size="small"
                      onClick={flipDuoOrder}
                      aria-label="듀오 정렬 순서 바꾸기"
                      sx={{ border: '1px solid', borderColor: 'divider' }}
                    >
                      <SwapVertIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
          </Paper>

          {sortedDuo.length === 0 ? (
            <StatsEmptyState
              title="듀오 조합이 없습니다"
              description="동일 2마리 조합이 100판 미만이거나, 리플레이·시너지 집계가 아직 없을 수 있습니다. 캐시로 인해 갱신이 늦을 수 있습니다."
            />
          ) : isNarrow ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {sortedDuo.map((row, i) => (
                <Card key={`${row.monster_id_1}-${row.monster_id_2}-${i}`} variant="outlined">
                  <CardContent sx={{ py: 2 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      spacing={1}
                      sx={{ mb: 1.5 }}
                    >
                      <Chip label={`#${duoOffset + i + 1}`} size="small" color="primary" variant="outlined" />
                      <Stack alignItems="flex-end" spacing={0.75}>
                        <Chip
                          size="small"
                          label={`${row.match_count.toLocaleString()}경기`}
                          variant="filled"
                          sx={{ fontWeight: 600, ...numericCellSx }}
                        />
                        <Typography
                          variant="h6"
                          fontWeight={800}
                          color="success.main"
                          sx={{ ...numericCellSx, lineHeight: 1.2 }}
                        >
                          {formatPercentage(row.win_rate)}
                        </Typography>
                      </Stack>
                    </Stack>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <MonsterCell
                        name={row.monster_name_1}
                        image={pickDuoMonsterImage(row, 1)}
                        elemental={row.monster_elemental_1}
                        monsterId={row.monster_id_1}
                      />
                      <MonsterCell
                        name={row.monster_name_2}
                        image={pickDuoMonsterImage(row, 2)}
                        elemental={row.monster_elemental_2}
                        monsterId={row.monster_id_2}
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', width: '100%', ...tableHeadSx }}>
                <TableHead>
                  <TableRow>
                    <TableCell width="4%">#</TableCell>
                    <TableCell width="56%">조합</TableCell>
                    <TableCell align="right" width="22%">
                      표본(경기)
                    </TableCell>
                    <TableCell align="right" width="18%">
                      승률
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedDuo.map((row, i) => (
                    <TableRow key={`${row.monster_id_1}-${row.monster_id_2}-${i}`} hover>
                      <TableCell sx={numericCellSx}>{duoOffset + i + 1}</TableCell>
                      <TableCell sx={{ verticalAlign: 'middle' }}>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr) 28px minmax(0, 1fr)',
                            alignItems: 'center',
                            width: '100%',
                            minWidth: 0,
                            columnGap: 0.5,
                          }}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <MonsterCell
                              name={row.monster_name_1}
                              image={pickDuoMonsterImage(row, 1)}
                              elemental={row.monster_elemental_1}
                              monsterId={row.monster_id_1}
                            />
                          </Box>
                          <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', flexShrink: 0 }}>
                            +
                          </Typography>
                          <Box sx={{ minWidth: 0 }}>
                            <MonsterCell
                              name={row.monster_name_2}
                              image={pickDuoMonsterImage(row, 2)}
                              elemental={row.monster_elemental_2}
                              monsterId={row.monster_id_2}
                            />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={numericCellSx}>
                        {row.match_count.toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={numericCellSx}>
                        <Typography fontWeight={700} color="success.main" component="span">
                          {formatPercentage(row.win_rate)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {duoTotal > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
              <Pagination
                count={Math.ceil(duoTotal / PAGE_SIZE)}
                page={duoPage}
                onChange={(_, p) => setDuoPage(p)}
                color="primary"
                showFirstButton
                showLastButton
                size={isNarrow ? 'small' : 'medium'}
                aria-label="듀오 통계 페이지"
              />
            </Box>
          )}
        </>
      )}

      {tab === 2 && (
        <>
          <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, px: 2, py: 1.75 }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', md: 'center' }}
                justifyContent="space-between"
              >
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <SortOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary' }} aria-hidden />
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      정렬 기준
                    </Typography>
                  </Stack>
                  <ToggleButtonGroup
                    exclusive
                    value={trioSortField}
                    onChange={handleTrioToggle}
                    size="small"
                    color="primary"
                    aria-label="트리오 조합 정렬"
                    sx={{
                      alignSelf: { xs: 'stretch', md: 'flex-start' },
                      '& .MuiToggleButton-root': {
                        px: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                      },
                    }}
                  >
                    <ToggleButton value="match_count">표본(경기 수)</ToggleButton>
                    <ToggleButton value="win_rate">승률</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ alignSelf: { md: 'center' }, flexWrap: 'wrap' }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {trioSortOrder === 'desc' ? '높은 값 먼저' : '낮은 값 먼저'}
                  </Typography>
                  <Tooltip title="오름차순 ↔ 내림차순">
                    <IconButton
                      size="small"
                      onClick={flipTrioOrder}
                      aria-label="트리오 정렬 순서 바꾸기"
                      sx={{ border: '1px solid', borderColor: 'divider' }}
                    >
                      <SwapVertIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
          </Paper>

          {sortedTrio.length === 0 ? (
            <StatsEmptyState
              title="트리오 조합이 없습니다"
              description="동일 3마리 조합이 100판 미만이거나, 리플레이·시너지 집계가 아직 없을 수 있습니다. 캐시로 인해 갱신이 늦을 수 있습니다."
            />
          ) : isNarrow ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {sortedTrio.map((row, i) => (
                <Card key={`${row.monster_id_1}-${row.monster_id_2}-${row.monster_id_3}-${i}`} variant="outlined">
                  <CardContent sx={{ py: 2 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      spacing={1}
                      sx={{ mb: 1.5 }}
                    >
                      <Chip label={`#${trioOffset + i + 1}`} size="small" color="primary" variant="outlined" />
                      <Stack alignItems="flex-end" spacing={0.75}>
                        <Chip
                          size="small"
                          label={`${row.match_count.toLocaleString()}경기`}
                          variant="filled"
                          sx={{ fontWeight: 600, ...numericCellSx }}
                        />
                        <Typography
                          variant="h6"
                          fontWeight={800}
                          color="success.main"
                          sx={{ ...numericCellSx, lineHeight: 1.2 }}
                        >
                          {formatPercentage(row.win_rate)}
                        </Typography>
                      </Stack>
                    </Stack>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <MonsterCell
                        name={row.monster_name_1}
                        image={pickTrioMonsterImage(row, 1)}
                        elemental={row.monster_elemental_1}
                        monsterId={row.monster_id_1}
                      />
                      <MonsterCell
                        name={row.monster_name_2}
                        image={pickTrioMonsterImage(row, 2)}
                        elemental={row.monster_elemental_2}
                        monsterId={row.monster_id_2}
                      />
                      <MonsterCell
                        name={row.monster_name_3}
                        image={pickTrioMonsterImage(row, 3)}
                        elemental={row.monster_elemental_3}
                        monsterId={row.monster_id_3}
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
              <Table
                size="small"
                stickyHeader
                sx={{ minWidth: 640, tableLayout: 'fixed', width: '100%', ...tableHeadSx }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell width="4%">#</TableCell>
                    <TableCell width="54%">조합</TableCell>
                    <TableCell align="right" width="22%">
                      표본(경기)
                    </TableCell>
                    <TableCell align="right" width="20%">
                      승률
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedTrio.map((row, i) => (
                    <TableRow key={`${row.monster_id_1}-${row.monster_id_2}-${row.monster_id_3}-${i}`} hover>
                      <TableCell sx={numericCellSx}>{trioOffset + i + 1}</TableCell>
                      <TableCell sx={{ verticalAlign: 'middle', maxWidth: 0 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: { xs: 0.25, sm: 0.5 },
                            width: '100%',
                            minWidth: 0,
                          }}
                        >
                          <Box sx={{ flex: '1 1 0', minWidth: 0, overflow: 'hidden' }}>
                            <MonsterCell
                              name={row.monster_name_1}
                              image={pickTrioMonsterImage(row, 1)}
                              elemental={row.monster_elemental_1}
                              monsterId={row.monster_id_1}
                            />
                          </Box>
                          <Typography variant="body2" color="text.disabled" sx={{ flexShrink: 0, px: 0.25 }}>
                            +
                          </Typography>
                          <Box sx={{ flex: '1 1 0', minWidth: 0, overflow: 'hidden' }}>
                            <MonsterCell
                              name={row.monster_name_2}
                              image={pickTrioMonsterImage(row, 2)}
                              elemental={row.monster_elemental_2}
                              monsterId={row.monster_id_2}
                            />
                          </Box>
                          <Typography variant="body2" color="text.disabled" sx={{ flexShrink: 0, px: 0.25 }}>
                            +
                          </Typography>
                          <Box sx={{ flex: '1 1 0', minWidth: 0, overflow: 'hidden' }}>
                            <MonsterCell
                              name={row.monster_name_3}
                              image={pickTrioMonsterImage(row, 3)}
                              elemental={row.monster_elemental_3}
                              monsterId={row.monster_id_3}
                            />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={numericCellSx}>
                        {row.match_count.toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={numericCellSx}>
                        <Typography fontWeight={700} color="success.main" component="span">
                          {formatPercentage(row.win_rate)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {trioTotal > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
              <Pagination
                count={Math.ceil(trioTotal / PAGE_SIZE)}
                page={trioPage}
                onChange={(_, p) => setTrioPage(p)}
                color="primary"
                showFirstButton
                showLastButton
                size={isNarrow ? 'small' : 'medium'}
                aria-label="트리오 통계 페이지"
              />
            </Box>
          )}
        </>
      )}
    </Container>
  );
}
