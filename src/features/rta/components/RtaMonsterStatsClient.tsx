'use client';

import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from 'react'; // useEffect는 페이지 리셋용으로 유지
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import SortOutlinedIcon from '@mui/icons-material/SortOutlined';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { getRenderableImageUrl } from '@/shared/utils/image';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import AttributeElementIcon from '@/shared/ui/attribute-element-icon/AttributeElementIcon';
import type { AttributeType } from '@/features/siege/types/monster';
import type { DuoComboStat, MonsterStats, TrioComboStat } from '@/features/rta/types/rta';
import {
  useRtaSeasonSelect,
  useRtaMonsterStats,
  useRtaRatingGradeRules,
  buildMonsterStatsTierBody,
} from '@/features/rta/hooks/useRtaData';
import { useRtaSeasonsContext } from '@/features/rta/context/RtaSeasonsContext';
import RtaSeasonTierSelectRow from '@/features/rta/components/RtaSeasonTierSelectRow';
import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { normalizeMonsterList } from '@/features/siege/lib/normalizeMonsterOption';
import type { MonsterOption } from '@/features/siege/hooks/useSiegeList';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortField = 'pick_count' | 'pick_rate' | 'win_rate' | 'ban_rate' | 'monster_name';
type SortOrder = 'asc' | 'desc';
type ComboSortField = 'match_count' | 'win_rate';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

/** 목록 탭 ↔ Next 라우트 (`/rta/monster-stats/{solo|duo|trio}`) */
const MONSTER_STATS_ROOT = '/rta/monster-stats';
const MONSTER_STATS_TAB_PATHS = [`${MONSTER_STATS_ROOT}/solo`, `${MONSTER_STATS_ROOT}/duo`, `${MONSTER_STATS_ROOT}/trio`] as const;

/** RTA+기본 스탯 통합 몬스터 상세 */
const MONSTER_DETAIL_BASE = '/monster-detail';

/**
 * 몬스터 상세 경로 — WAS `getRtaMonsterBasicInfo` 등은 `unit_master_id`(픽에 찍힌 ID)로 조회한다.
 * `rta_stats_monster_id`(콜라보→원본 집계 키)로 링크하면 픽 데이터와 어긋나 상세가 비어 404가 난다.
 */
function rtaMonsterDetailHref(monsterId: string | undefined | null): string | undefined {
  const id = monsterId != null ? String(monsterId).trim() : '';
  if (!id) return undefined;
  return `${MONSTER_DETAIL_BASE}/${encodeURIComponent(id)}`;
}

function tabFromPathname(pathname: string): 0 | 1 | 2 {
  if (pathname === `${MONSTER_STATS_ROOT}/duo` || pathname.startsWith(`${MONSTER_STATS_ROOT}/duo/`)) {
    return 1;
  }
  if (pathname === `${MONSTER_STATS_ROOT}/trio` || pathname.startsWith(`${MONSTER_STATS_ROOT}/trio/`)) {
    return 2;
  }
  if (pathname === `${MONSTER_STATS_ROOT}/solo` || pathname.startsWith(`${MONSTER_STATS_ROOT}/solo/`)) {
    return 0;
  }
  return 0;
}

const NUMERIC_CELL_SX = { fontVariantNumeric: 'tabular-nums' as const };

type ElementFilterValue = 'all' | AttributeType;

const ELEMENT_TOGGLE_ORDER: AttributeType[] = ['fire', 'water', 'wind', 'light', 'dark'];

const TABLE_HEAD_CELL_SX = {
  fontWeight: 800,
  fontSize: '0.75rem',
  letterSpacing: '0.04em',
  color: 'text.secondary',
  borderBottom: '2px solid',
  borderColor: 'divider',
  bgcolor: 'action.hover',
  whiteSpace: 'nowrap' as const,
};

// ─── Utils ────────────────────────────────────────────────────────────────────

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function formatPercentage(value: number): string {
  return `${toNum(value).toFixed(2)}%`;
}

function parseElemental(raw?: string): AttributeType | null {
  const k = raw?.trim().toLowerCase();
  if (k === 'fire' || k === 'water' || k === 'wind' || k === 'light' || k === 'dark') return k;
  return null;
}

function monsterOptionMatchesSearch(m: MonsterOption, q: string): boolean {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  const parts = [m.kr_name, m.un_name, m.modified_kr_name]
    .filter((s): s is string => s != null && String(s).trim() !== '')
    .map((s) => String(s).toLowerCase());
  return parts.some((n) => n.includes(t));
}

function monsterOptionMatchesElement(m: MonsterOption, elementFilter: ElementFilterValue): boolean {
  if (elementFilter === 'all') return true;
  const attr = parseElemental(m.monster_elemental);
  return attr === elementFilter;
}

function toRecord(v: unknown): Record<string, unknown> {
  return (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
}

function normalizeMonsterStat(raw: MonsterStats): MonsterStats {
  const r = toRecord(raw);
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
    ban_rate: toNum(raw.ban_rate ?? r.banRate),
  };
}

function normalizeComboStat<T extends { match_count: unknown; win_rate: unknown }>(row: T): T {
  return { ...row, match_count: toNum(row.match_count), win_rate: toNum(row.win_rate) };
}

function pickComboMonsterImage(row: DuoComboStat | TrioComboStat, slot: number): string | undefined {
  const r = toRecord(row);
  for (const k of [`monster_image_${slot}`, `monsterImage${slot}`, `monster_image${slot}`]) {
    const v = r[k];
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return undefined;
}

function sortCombo<T extends { match_count: number; win_rate: number }>(
  data: T[], field: ComboSortField, order: SortOrder,
): T[] {
  if (data.length === 0) return [];
  return [...data].sort((a, b) => {
    const diff = (field === 'match_count' ? a.match_count : a.win_rate)
               - (field === 'match_count' ? b.match_count : b.win_rate);
    return order === 'asc' ? diff : -diff;
  });
}

// ─── MonsterCell ──────────────────────────────────────────────────────────────

interface MonsterCellProps {
  name?: string;
  image?: string;
  elemental?: string;
  monsterId?: string;
}

const MonsterCell = memo(function MonsterCell({ name, image, elemental, monsterId }: MonsterCellProps) {
  const attr = parseElemental(elemental);
  const displayName = name?.trim() || '—';
  const href = rtaMonsterDetailHref(monsterId);

  const inner = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, width: '100%' }}>
      <Avatar
        src={getRenderableImageUrl(image)}
        alt={displayName}
        variant="rounded"
        sx={{ width: 40, height: 40, flexShrink: 0, border: '1px solid', borderColor: 'divider' }}
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
          display: 'block',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        {inner}
      </Box>
    );
  }

  return <Box sx={{ width: '100%', minWidth: 0 }}>{inner}</Box>;
});

// ─── StatsEmptyState ──────────────────────────────────────────────────────────

const StatsEmptyState = memo(function StatsEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
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
});

// ─── Combo 조합 행 (듀오·트리오 공통) ─────────────────────────────────────────

const ComboStatRow = memo(function ComboStatRow({
  rank,
  matchCount,
  winRate,
  children,
}: {
  rank: number;
  matchCount: number;
  winRate: number;
  children: ReactNode;
}) {
  const wr = toNum(winRate);
  const winWarm = wr >= 52;
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        p: { xs: 2, sm: 2.25 },
        background: (t) =>
          `linear-gradient(120deg, ${alpha(t.palette.success.main, 0.04)} 0%, ${alpha(t.palette.background.paper, 1)} 40%)`,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: (t) => `0 8px 28px ${alpha(t.palette.common.black, 0.08)}`,
        },
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: '0.8rem',
            color: 'text.secondary',
            width: { md: 40 },
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          #{rank}
        </Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
        <Stack
          direction="row"
          spacing={2.5}
          sx={{
            flexShrink: 0,
            alignSelf: { xs: 'stretch', md: 'center' },
            justifyContent: { xs: 'space-between', md: 'flex-end' },
          }}
        >
          <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
              표본
            </Typography>
            <Typography fontWeight={800} sx={{ ...NUMERIC_CELL_SX, fontSize: '1rem' }}>
              {matchCount.toLocaleString()}
            </Typography>
          </Box>
          <Box sx={{ textAlign: { xs: 'right', md: 'right' }, minWidth: 72 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
              승률
            </Typography>
            <Typography
              fontWeight={900}
              sx={{
                ...NUMERIC_CELL_SX,
                fontSize: '1.15rem',
                color: winWarm ? 'success.main' : 'text.primary',
              }}
            >
              {formatPercentage(wr)}
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </Paper>
  );
});

// ─── ComboSortBar ─────────────────────────────────────────────────────────────

const ComboSortBar = memo(function ComboSortBar({
  sortField,
  sortOrder,
  onFieldChange,
  onFlipOrder,
  ariaLabel,
}: {
  sortField: ComboSortField;
  sortOrder: SortOrder;
  onFieldChange: (field: ComboSortField) => void;
  onFlipOrder: () => void;
  ariaLabel: string;
}) {
  const handleToggle = useCallback(
    (_: SyntheticEvent, value: ComboSortField | null) => {
      if (value !== null) onFieldChange(value);
    },
    [onFieldChange],
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        mb: 2.5,
        borderRadius: 2.5,
        px: { xs: 2, sm: 2.5 },
        py: 2,
        borderColor: 'divider',
        bgcolor: (t) => alpha(t.palette.action.hover, 0.2),
      }}
    >
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
            value={sortField}
            onChange={handleToggle}
            size="small"
            color="primary"
            aria-label={ariaLabel}
            sx={{
              alignSelf: { xs: 'stretch', md: 'flex-start' },
              '& .MuiToggleButton-root': { px: 2, textTransform: 'none', fontWeight: 600 },
            }}
          >
            <ToggleButton value="match_count">표본(경기 수)</ToggleButton>
            <ToggleButton value="win_rate">승률</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ alignSelf: { md: 'center' }, flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary">
            {sortOrder === 'desc' ? '높은 값 먼저' : '낮은 값 먼저'}
          </Typography>
          <Tooltip title="오름차순 ↔ 내림차순">
            <IconButton
              size="small"
              onClick={onFlipOrder}
              aria-label="정렬 순서 바꾸기"
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <SwapVertIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
});

// ─── 솔로 표 헤더 (정렬) ────────────────────────────────────────────────────────

const SoloSortableTh = memo(function SoloSortableTh({
  label,
  field,
  activeField,
  order,
  onSort,
  align = 'right',
}: {
  label: string;
  field: SortField;
  activeField: SortField;
  order: SortOrder;
  onSort: (f: SortField) => void;
  align?: 'left' | 'right';
}) {
  const active = activeField === field;
  return (
    <TableCell
      align={align}
      onClick={() => onSort(field)}
      sx={{
        ...TABLE_HEAD_CELL_SX,
        cursor: 'pointer',
        userSelect: 'none',
        '&:hover': { bgcolor: 'action.selected' },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent={align === 'right' ? 'flex-end' : 'flex-start'}
        spacing={0.5}
      >
        {label}
        {active ? (
          order === 'asc' ? (
            <ArrowUpwardIcon sx={{ fontSize: 16, opacity: 0.85 }} />
          ) : (
            <ArrowDownwardIcon sx={{ fontSize: 16, opacity: 0.85 }} />
          )
        ) : null}
      </Stack>
    </TableCell>
  );
});

// ─── StatsPagination ──────────────────────────────────────────────────────────

const StatsPagination = memo(function StatsPagination({
  page,
  hasMore,
  onChange,
  ariaLabel,
  isNarrow,
}: {
  page: number;
  hasMore: boolean;
  onChange: (page: number) => void;
  ariaLabel: string;
  isNarrow: boolean;
}) {
  if (page <= 1 && !hasMore) return null;
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, pt: 2 }}>
      <Button variant="outlined" size={isNarrow ? 'small' : 'medium'} disabled={page <= 1}
        onClick={() => onChange(page - 1)} aria-label={`${ariaLabel} 이전 페이지`}>
        이전
      </Button>
      <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, whiteSpace: 'nowrap', fontWeight: 600 }}>
        {page}페이지
      </Typography>
      <Button variant="outlined" size={isNarrow ? 'small' : 'medium'} disabled={!hasMore}
        onClick={() => onChange(page + 1)} aria-label={`${ariaLabel} 다음 페이지`}>
        다음
      </Button>
    </Box>
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RtaMonsterStatsClient() {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const pathname = usePathname();
  const router = useRouter();
  const tab = useMemo(() => tabFromPathname(pathname), [pathname]);

  // Season
  const { data: seasonsData } = useRtaSeasonsContext();
  const { seasonSelectValue, seasonIdForApi, setSeason, seasonOptions } = useRtaSeasonSelect(seasonsData);

  // Pagination
  const [statsPage, setStatsPage] = useState(1);
  const [duoPage, setDuoPage] = useState(1);
  const [trioPage, setTrioPage] = useState(1);

  // Filters
  const [tierSelection, setTierSelection] = useState('');
  const [soloSearch, setSoloSearch] = useState('');
  const [elementFilter, setElementFilter] = useState<ElementFilterValue>('all');

  // Solo sort
  const [sortField, setSortField] = useState<SortField>('pick_count');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Combo sort
  const [duoSortField, setDuoSortField] = useState<ComboSortField>('match_count');
  const [duoSortOrder, setDuoSortOrder] = useState<SortOrder>('desc');
  const [trioSortField, setTrioSortField] = useState<ComboSortField>('match_count');
  const [trioSortOrder, setTrioSortOrder] = useState<SortOrder>('desc');

  const statsOffset = (statsPage - 1) * PAGE_SIZE;
  const duoOffset  = (duoPage  - 1) * PAGE_SIZE;
  const trioOffset = (trioPage - 1) * PAGE_SIZE;

  // Reset pages when filters change
  useEffect(() => {
    queueMicrotask(() => {
      setStatsPage(1);
      setDuoPage(1);
      setTrioPage(1);
    });
  }, [tierSelection, seasonSelectValue]);

  // Data
  const { data: gradeRules = [], isLoading: tierRulesLoading } = useRtaRatingGradeRules();

  const { data: monsterCatalog = [], isLoading: catalogLoading } = useApiPostQuery<MonsterOption[]>(
    '/summonerswar/monster-list',
    {},
    {
      enabled: tab === 0,
      select: (raw) => normalizeMonsterList(raw),
      staleTime: 30 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  );

  const tierFilterBody = useMemo(
    () => buildMonsterStatsTierBody(tierSelection, gradeRules),
    [tierSelection, gradeRules],
  );

  const commonParams = {
    limit: PAGE_SIZE,
    seasonCode: seasonSelectValue,
    seasonId: seasonIdForApi,
    ...tierFilterBody,
  };
  const { data: soloData, isLoading: soloLoading, isFetching: soloFetching, error: soloError } = useRtaMonsterStats({ ...commonParams, type: 'solo', offset: statsOffset, enabled: tab === 0 });
  const { data: duoData,  isLoading: duoLoading,  isFetching: duoFetching  } = useRtaMonsterStats({ ...commonParams, type: 'duo',  offset: duoOffset,  enabled: tab === 1 });
  const { data: trioData, isLoading: trioLoading, isFetching: trioFetching } = useRtaMonsterStats({ ...commonParams, type: 'trio', offset: trioOffset, enabled: tab === 2 });

  const isLoading = tab === 0 ? soloLoading : tab === 1 ? duoLoading : trioLoading;
  const isFetching = tab === 0 ? soloFetching : tab === 1 ? duoFetching : trioFetching;
  const error = soloError;

  // Normalized data
  const stats = useMemo(() => (soloData?.rows as MonsterStats[] ?? []).map(normalizeMonsterStat), [soloData?.rows]);
  const duoStats  = useMemo(() => (duoData?.rows  as DuoComboStat[]  ?? []).map(normalizeComboStat), [duoData?.rows]);
  const trioStats = useMemo(() => (trioData?.rows as TrioComboStat[] ?? []).map(normalizeComboStat), [trioData?.rows]);

  const statsHasMore = soloData?.has_more  ?? false;
  const duoHasMore   = duoData?.has_more   ?? false;
  const trioHasMore  = trioData?.has_more  ?? false;

  // Sorted data
  const sortedStats = useMemo(() => {
    if (stats.length === 0) return [];
    const mul = sortOrder === 'asc' ? 1 : -1;
    return [...stats].sort((a, b) => {
      if (sortField === 'monster_name') return mul * a.monster_name.localeCompare(b.monster_name);
      const aVal = (a as unknown as Record<string, number>)[sortField] ?? 0;
      const bVal = (b as unknown as Record<string, number>)[sortField] ?? 0;
      return mul * (aVal - bVal);
    });
  }, [stats, sortField, sortOrder]);

  /** 전체 몬스터 마스터(노말·각성·2각 등 전 행) — 검색·속성만 목록용 (테이블과 무관). 표시는 역순. */
  const soloCatalogFiltered = useMemo(() => {
    if (!monsterCatalog.length) return [];
    const rows = monsterCatalog.filter((m) => {
      if (!m.monster_id?.trim()) return false;
      if (!monsterOptionMatchesSearch(m, soloSearch)) return false;
      if (!monsterOptionMatchesElement(m, elementFilter)) return false;
      return true;
    });
    return rows.slice().reverse();
  }, [monsterCatalog, soloSearch, elementFilter]);

  const sortedDuo  = useMemo(() => sortCombo(duoStats,  duoSortField,  duoSortOrder),  [duoStats,  duoSortField,  duoSortOrder]);
  const sortedTrio = useMemo(() => sortCombo(trioStats, trioSortField, trioSortOrder), [trioStats, trioSortField, trioSortOrder]);

  // Handlers
  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortOrder('desc');
      return field;
    });
  }, []);

  const handleDuoFieldChange = useCallback((field: ComboSortField) => {
    setDuoSortField(field);
    setDuoSortOrder('desc');
  }, []);

  const handleTrioFieldChange = useCallback((field: ComboSortField) => {
    setTrioSortField(field);
    setTrioSortOrder('desc');
  }, []);

  const flipDuoOrder  = useCallback(() => setDuoSortOrder( (o) => (o === 'asc' ? 'desc' : 'asc')), []);
  const flipTrioOrder = useCallback(() => setTrioSortOrder((o) => (o === 'asc' ? 'desc' : 'asc')), []);

  const handleTabChange = useCallback(
    (_e: SyntheticEvent, v: number) => {
      const idx = v as 0 | 1 | 2;
      router.push(MONSTER_STATS_TAB_PATHS[idx]);
    },
    [router],
  );

  const handleElementFilterChange = useCallback(
    (_e: SyntheticEvent, v: ElementFilterValue | null) => {
      if (v != null) setElementFilter(v);
    },
    [],
  );

  const catalogDisplayName = useCallback((m: MonsterOption) => {
    const k = m.kr_name?.trim();
    if (k) return k;
    const u = m.un_name?.trim();
    if (u) return u;
    return '—';
  }, []);

  // ── Loading state ──────────────────────────────────────────────────────────

  if (isLoading && soloData === undefined && duoData === undefined && trioData === undefined) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
        <PageHeader title="RTA 몬스터별 통계" />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 280 }}>
          <CircularProgress aria-label="통계 불러오는 중" />
        </Box>
      </Container>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

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

      {/* Tabs */}
      <Paper
        elevation={0}
        sx={{
          mb: 2.5,
          borderRadius: 2.5,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          bgcolor: (t) => alpha(t.palette.background.paper, 0.8),
        }}
      >
        <Tabs
          value={tab}
          onChange={handleTabChange}
          variant="fullWidth"
          aria-label="몬스터 통계 보기 방식"
          sx={{
            minHeight: 54,
            px: 0.5,
            '& .MuiTab-root': {
              minHeight: 54,
              fontWeight: 700,
              textTransform: 'none',
              fontSize: { xs: '0.78rem', sm: '0.875rem' },
              gap: 0.75,
            },
            '& .MuiTabs-indicator': { height: 3, borderRadius: 999 },
          }}
        >
          <Tab icon={<PersonIcon fontSize="small" />}     iconPosition="start" label="솔로 (1마리)" />
          <Tab icon={<Diversity3Icon fontSize="small" />} iconPosition="start" label="듀오 (2마리)" />
          <Tab icon={<GroupsIcon fontSize="small" />}     iconPosition="start" label="트리오 (3마리)" />
        </Tabs>
      </Paper>

      {/* ── Solo Tab: PC 좌(검색·필터·썸네일) / 우(시즌·티어·테이블) ── */}
      {tab === 0 && (
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 2.5, md: 3 }}
          alignItems={{ xs: 'stretch', md: 'flex-start' }}
          sx={{ width: '100%', alignItems: { md: 'stretch' } }}
        >
          {/* 좌측: 검색 → 상세 조건 → 몬스터 썸네일 3열 */}
          <Box
            id="search-hero"
            sx={{
              width: { xs: '100%' },
              flex: { md: '0 0 380px' },
              maxWidth: { md: 400 },
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: (t) => alpha(t.palette.background.paper, 0.9),
                height: { md: '100%' },
              }}
            >
              <Box className="serchbox-wrap" sx={{ mb: 2 }}>
                <Box
                  component="form"
                  className="search-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row', md: 'column' }}
                    spacing={1.5}
                    alignItems={{ xs: 'stretch', sm: 'center', md: 'stretch' }}
                    className="search-container"
                  >
                    <TextField
                      size="small"
                      fullWidth
                      className="search-input"
                      placeholder="몬스터 검색"
                      value={soloSearch}
                      onChange={(e) => setSoloSearch(e.target.value)}
                      autoComplete="off"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" color="action" aria-hidden />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ flex: 1 }}
                    />
                    <Button type="submit" variant="contained" size="medium" className="search-button" sx={{ flexShrink: 0, minWidth: { xs: 88, md: '100%' } }}>
                      검색
                    </Button>
                  </Stack>
                </Box>
              </Box>

              <Box className="detail-filter" sx={{ textAlign: 'left', mb: soloCatalogFiltered.length > 0 || catalogLoading ? 2 : 0 }}>
                <Typography component="h3" sx={{ m: 0, mb: 1.25, fontSize: '1rem', fontWeight: 800 }}>
                  상세 조건
                </Typography>
                <Box className="filter-list">
                  <ToggleButtonGroup
                    exclusive
                    value={elementFilter}
                    onChange={handleElementFilterChange}
                    size="small"
                    color="primary"
                    aria-label="속성 필터"
                    sx={{
                      flexWrap: 'wrap',
                      gap: 0.75,
                      justifyContent: 'flex-start',
                      '& .MuiToggleButtonGroup-grouped': { borderRadius: '8px !important', border: '1px solid', my: 0.25 },
                    }}
                  >
                    <ToggleButton value="all" sx={{ px: 1.5, textTransform: 'none', fontWeight: 600 }}>
                      전체
                    </ToggleButton>
                    {ELEMENT_TOGGLE_ORDER.map((el) => (
                      <ToggleButton key={el} value={el} sx={{ px: 1.25, minWidth: 44 }} aria-label={el}>
                        <AttributeElementIcon attribute={el} size={22} />
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>
              </Box>

              {catalogLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={28} aria-label="몬스터 목록 불러오는 중" />
                </Box>
              )}
              {!catalogLoading && soloCatalogFiltered.length > 0 && (
                <Box
                  className="filterlist-wrap"
                  component="ul"
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 1,
                    m: 0,
                    p: 0,
                    listStyle: 'none',
                    alignContent: 'start',
                    maxHeight: { md: 'min(60vh, 520px)' },
                    overflowY: 'auto',
                    pr: 0.5,
                  }}
                >
                  {soloCatalogFiltered.map((m) => {
                    const label = catalogDisplayName(m);
                    const href = rtaMonsterDetailHref(m.monster_id);
                    const inner = (
                      <Stack alignItems="center" spacing={0.5} sx={{ width: '100%', py: 0.25 }}>
                        <Avatar
                          src={getRenderableImageUrl(m.image_url)}
                          alt={label}
                          variant="rounded"
                          sx={{ width: 44, height: 44, border: '1px solid', borderColor: 'divider' }}
                        >
                          {label.charAt(0)}
                        </Avatar>
                        <Typography variant="caption" color="text.secondary" noWrap title={label} sx={{ width: '100%', textAlign: 'center', lineHeight: 1.2, fontSize: '0.65rem' }}>
                          {label}
                        </Typography>
                      </Stack>
                    );
                    return (
                      <Box key={m.monster_id} component="li" sx={{ listStyle: 'none', minWidth: 0 }}>
                        {href ? (
                          <Box
                            component={Link}
                            href={href}
                            sx={{
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'divider',
                              p: 0.5,
                              cursor: 'pointer',
                              width: '100%',
                              textDecoration: 'none',
                              color: 'inherit',
                              display: 'block',
                              '&:hover': { bgcolor: 'action.hover' },
                            }}
                          >
                            {inner}
                          </Box>
                        ) : (
                          <Box sx={{ borderRadius: 1, border: '1px dashed', borderColor: 'divider', p: 0.5 }}>{inner}</Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}
              {!catalogLoading && monsterCatalog.length > 0 && soloCatalogFiltered.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                  검색·속성에 맞는 몬스터가 없습니다.
                </Typography>
              )}
            </Paper>
          </Box>

          {/* 우측: 시즌·티어 → 표 */}
          <Box id="popular-hero-list" sx={{ flex: '1 1 auto', minWidth: 0, width: { xs: '100%', md: 'auto' } }}>
            <RtaSeasonTierSelectRow
              seasonSelectValue={seasonSelectValue}
              setSeason={setSeason}
              seasonOptions={seasonOptions}
              tierSelection={tierSelection}
              setTierSelection={setTierSelection}
              gradeRules={gradeRules}
              tierRulesLoading={tierRulesLoading}
              seasonLabelId="monster-stats-season-label"
            />

            {sortedStats.length === 0 ? (
              <StatsEmptyState
                title="표시할 통계가 없습니다"
                description="표본이 100판 미만인 몬스터는 목록에서 제외합니다. 리플레이가 부족하거나 집계가 아직 반영되지 않았을 수 있습니다. 잠시 후 다시 확인해 주세요."
              />
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
                      <TableCell align="center" sx={{ ...TABLE_HEAD_CELL_SX, width: 52 }}>#</TableCell>
                      <SoloSortableTh label="몬스터" field="monster_name" activeField={sortField} order={sortOrder} onSort={handleSort} align="left" />
                      <SoloSortableTh label="픽횟수" field="pick_count" activeField={sortField} order={sortOrder} onSort={handleSort} />
                      <SoloSortableTh label="픽률" field="pick_rate" activeField={sortField} order={sortOrder} onSort={handleSort} />
                      <SoloSortableTh label="승률" field="win_rate" activeField={sortField} order={sortOrder} onSort={handleSort} />
                      <SoloSortableTh label="벤율" field="ban_rate" activeField={sortField} order={sortOrder} onSort={handleSort} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedStats.map((stat) => {
                      const idx = sortedStats.indexOf(stat);
                      const rank = statsOffset + idx + 1;
                      return (
                        <TableRow key={stat.monster_id ?? stat.monster_name} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                          <TableCell align="center" sx={{ ...NUMERIC_CELL_SX, color: 'text.secondary', fontWeight: 700, fontSize: '0.8rem' }}>
                            {rank}
                          </TableCell>
                          <TableCell sx={{ minWidth: 200, maxWidth: 280 }}>
                            <MonsterCell
                              name={stat.monster_name}
                              image={stat.monster_image}
                              elemental={stat.monster_elemental}
                              monsterId={stat.monster_id}
                            />
                          </TableCell>
                          <TableCell align="right" sx={NUMERIC_CELL_SX}>{toNum(stat.pick_count).toLocaleString()}</TableCell>
                          <TableCell align="right" sx={NUMERIC_CELL_SX}>{formatPercentage(stat.pick_rate)}</TableCell>
                          <TableCell align="right" sx={NUMERIC_CELL_SX}>{formatPercentage(stat.win_rate)}</TableCell>
                          <TableCell align="right" sx={NUMERIC_CELL_SX}>{formatPercentage(stat.ban_rate)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <StatsPagination
              hasMore={statsHasMore}
              page={statsPage}
              onChange={setStatsPage}
              ariaLabel="솔로 통계 페이지"
              isNarrow={isNarrow}
            />
          </Box>
        </Stack>
      )}

      {/* ── Duo Tab ── */}
      {tab === 1 && (
        <>
          <RtaSeasonTierSelectRow
            seasonSelectValue={seasonSelectValue}
            setSeason={setSeason}
            seasonOptions={seasonOptions}
            tierSelection={tierSelection}
            setTierSelection={setTierSelection}
            gradeRules={gradeRules}
            tierRulesLoading={tierRulesLoading}
            seasonLabelId="monster-stats-season-label"
          />
          <ComboSortBar
            sortField={duoSortField}
            sortOrder={duoSortOrder}
            onFieldChange={handleDuoFieldChange}
            onFlipOrder={flipDuoOrder}
            ariaLabel="듀오 조합 정렬"
          />

          {sortedDuo.length === 0 ? (
            <StatsEmptyState
              title="듀오 조합이 없습니다"
              description="동일 2마리 조합이 100판 미만이거나, 리플레이·시너지 집계가 아직 없을 수 있습니다. 캐시로 인해 갱신이 늦을 수 있습니다."
            />
          ) : (
            <Stack spacing={1.75}>
              {sortedDuo.map((row, i) => (
                <ComboStatRow
                  key={`${row.monster_id_1}-${row.monster_id_2}-${i}`}
                  rank={duoOffset + i + 1}
                  matchCount={row.match_count}
                  winRate={row.win_rate}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: { xs: 1, sm: 1.5 },
                      justifyContent: { xs: 'center', sm: 'flex-start' },
                    }}
                  >
                    <Box sx={{ flex: { sm: '1 1 200px' }, minWidth: 0 }}>
                      <MonsterCell
                        name={row.monster_name_1}
                        image={pickComboMonsterImage(row, 1)}
                        elemental={row.monster_elemental_1}
                        monsterId={row.monster_id_1}
                      />
                    </Box>
                    <Typography variant="body2" color="text.disabled" sx={{ px: 0.25, fontWeight: 700 }}>
                      +
                    </Typography>
                    <Box sx={{ flex: { sm: '1 1 200px' }, minWidth: 0 }}>
                      <MonsterCell
                        name={row.monster_name_2}
                        image={pickComboMonsterImage(row, 2)}
                        elemental={row.monster_elemental_2}
                        monsterId={row.monster_id_2}
                      />
                    </Box>
                  </Box>
                </ComboStatRow>
              ))}
            </Stack>
          )}

          <StatsPagination hasMore={duoHasMore} page={duoPage} onChange={setDuoPage} ariaLabel="듀오 통계 페이지" isNarrow={isNarrow} />
        </>
      )}

      {/* ── Trio Tab ── */}
      {tab === 2 && (
        <>
          <RtaSeasonTierSelectRow
            seasonSelectValue={seasonSelectValue}
            setSeason={setSeason}
            seasonOptions={seasonOptions}
            tierSelection={tierSelection}
            setTierSelection={setTierSelection}
            gradeRules={gradeRules}
            tierRulesLoading={tierRulesLoading}
            seasonLabelId="monster-stats-season-label"
          />
          <ComboSortBar
            sortField={trioSortField}
            sortOrder={trioSortOrder}
            onFieldChange={handleTrioFieldChange}
            onFlipOrder={flipTrioOrder}
            ariaLabel="트리오 조합 정렬"
          />

          {sortedTrio.length === 0 ? (
            <StatsEmptyState
              title="트리오 조합이 없습니다"
              description="동일 3마리 조합이 100판 미만이거나, 리플레이·시너지 집계가 아직 없을 수 있습니다. 캐시로 인해 갱신이 늦을 수 있습니다."
            />
          ) : (
            <Stack spacing={1.75}>
              {sortedTrio.map((row, i) => (
                <ComboStatRow
                  key={`${row.monster_id_1}-${row.monster_id_2}-${row.monster_id_3}-${i}`}
                  rank={trioOffset + i + 1}
                  matchCount={row.match_count}
                  winRate={row.win_rate}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: { xs: 0.75, sm: 1 },
                      justifyContent: { xs: 'center', md: 'flex-start' },
                    }}
                  >
                    {[1, 2, 3].map((slot, j) => (
                      <Fragment key={slot}>
                        {j > 0 && (
                          <Typography variant="body2" color="text.disabled" sx={{ px: 0.15, fontWeight: 700 }}>
                            +
                          </Typography>
                        )}
                        <Box sx={{ flex: { md: '1 1 140px' }, minWidth: { md: 120 }, maxWidth: '100%' }}>
                          <MonsterCell
                            name={slot === 1 ? row.monster_name_1 : slot === 2 ? row.monster_name_2 : row.monster_name_3}
                            image={pickComboMonsterImage(row, slot)}
                            elemental={slot === 1 ? row.monster_elemental_1 : slot === 2 ? row.monster_elemental_2 : row.monster_elemental_3}
                            monsterId={slot === 1 ? row.monster_id_1 : slot === 2 ? row.monster_id_2 : row.monster_id_3}
                          />
                        </Box>
                      </Fragment>
                    ))}
                  </Box>
                </ComboStatRow>
              ))}
            </Stack>
          )}

          <StatsPagination hasMore={trioHasMore} page={trioPage} onChange={setTrioPage} ariaLabel="트리오 통계 페이지" isNarrow={isNarrow} />
        </>
      )}
    </Container>
  );
}
