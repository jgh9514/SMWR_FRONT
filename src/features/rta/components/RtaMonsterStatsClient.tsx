'use client';

import {
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
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  FormControl,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
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
  Typography,
  useMediaQuery,
  useTheme,
  type SelectChangeEvent,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
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
  fetchRtaMonsterStats,
  getRtaMonsterStatsQueryKey,
  RTA_MONSTER_STATS_GC_MS,
  RTA_MONSTER_STATS_STALE_MS,
} from '@/features/rta/hooks/useRtaData';
import { useRtaSeasonsContext } from '@/features/rta/context/RtaSeasonsContext';
import RtaSeasonTierSelectRow, {
  RTA_OUTLINED_SELECT_FIELD_SX,
  RTA_OUTLINED_SELECT_INPUT_SLOT_SX,
  RTA_SELECT_MENU_PROPS,
} from '@/features/rta/components/RtaSeasonTierSelectRow';
import { blurFocusedMenuItem } from '@/features/rta/rtaMenuModalProps';
import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { normalizeMonsterList } from '@/features/siege/lib/normalizeMonsterOption';
import type { MonsterOption } from '@/features/siege/hooks/useSiegeList';
import { parseMonsterElemental } from '@/shared/utils/monsterElemental';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortOrder = 'asc' | 'desc';
type ComboSortField = 'match_count' | 'win_rate';

/** 솔로·듀오·트리오 공통: 픽횟수(듀오·트리오는 경기 수)·승률 × 오름/내림 4가지 */
const MONSTER_STATS_SORT_KEYS = [
  'pick_count_asc',
  'pick_count_desc',
  'win_rate_asc',
  'win_rate_desc',
] as const;
type MonsterStatsSortKey = (typeof MONSTER_STATS_SORT_KEYS)[number];

/** 접근용 전체 문구(화면에는 지표+화살표만) */
const MONSTER_STATS_SORT_LABEL: Record<MonsterStatsSortKey, string> = {
  pick_count_asc: '픽횟수 오름차순',
  pick_count_desc: '픽횟수 내림차순',
  win_rate_asc: '승률 오름차순',
  win_rate_desc: '승률 내림차순',
};

function monsterStatsSortOptionContent(k: MonsterStatsSortKey) {
  const metric = k.startsWith('pick_count') ? '픽횟수' : '승률';
  const asc = k.endsWith('_asc');
  const Icon = asc ? ArrowUpwardIcon : ArrowDownwardIcon;
  return (
    <Stack direction="row" alignItems="center" spacing={0.5} component="span">
      <Box component="span" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
        {metric}
      </Box>
      <Icon sx={{ fontSize: 18, color: 'action.active' }} aria-hidden />
    </Stack>
  );
}

function monsterStatsSortToSoloField(
  key: MonsterStatsSortKey,
): { field: 'pick_count' | 'win_rate'; order: SortOrder } {
  switch (key) {
    case 'pick_count_asc':
      return { field: 'pick_count', order: 'asc' };
    case 'pick_count_desc':
      return { field: 'pick_count', order: 'desc' };
    case 'win_rate_asc':
      return { field: 'win_rate', order: 'asc' };
    case 'win_rate_desc':
      return { field: 'win_rate', order: 'desc' };
  }
}

/** 듀오·트리오: pick_count_* → match_count(경기 수) 정렬 */
function monsterStatsSortToComboField(key: MonsterStatsSortKey): { field: ComboSortField; order: SortOrder } {
  const { field, order } = monsterStatsSortToSoloField(key);
  if (field === 'pick_count') return { field: 'match_count', order };
  return { field: 'win_rate', order };
}

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
  const attr = parseMonsterElemental(m.monster_elemental);
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
  const attr = parseMonsterElemental(elemental);
  const displayName = name?.trim() || '—';
  const href = rtaMonsterDetailHref(monsterId);

  const inner = (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, minWidth: 0, width: '100%' }}>
      <Avatar
        src={getRenderableImageUrl(image)}
        alt={displayName}
        variant="rounded"
        sx={{ width: 40, height: 40, flexShrink: 0, border: '1px solid', borderColor: 'divider' }}
      >
        {displayName.charAt(0)}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1, overflow: { xs: 'visible', md: 'hidden' } }}>
        <Typography
          variant="body2"
          fontWeight={600}
          title={displayName}
          sx={(theme) => ({
            lineHeight: 1.4,
            wordBreak: 'break-word',
            [theme.breakpoints.down('md')]: {
              whiteSpace: 'normal',
              overflow: 'visible',
              textOverflow: 'clip',
            },
            [theme.breakpoints.up('md')]: {
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
          })}
        >
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
        prefetch={false}
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

/** 듀오·트리오: 썸네일 위 + 이름 아래(솔로 좌측 썸네일 그리드와 유사) */
const COMBO_TILE_AVATAR_PX = 48;

const ComboMonsterTile = memo(function ComboMonsterTile({ name, image, elemental, monsterId }: MonsterCellProps) {
  const attr = parseMonsterElemental(elemental);
  const displayName = name?.trim() || '—';
  const href = rtaMonsterDetailHref(monsterId);

  const body = (
    <Stack
      alignItems="center"
      spacing={0.5}
      sx={{ minWidth: 0, width: '100%', py: 0.5, textAlign: 'center' }}
    >
      <Avatar
        src={getRenderableImageUrl(image)}
        alt={displayName}
        variant="rounded"
        sx={{
          width: COMBO_TILE_AVATAR_PX,
          height: COMBO_TILE_AVATAR_PX,
          flexShrink: 0,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {displayName.charAt(0)}
      </Avatar>
      <Typography
        variant="caption"
        color="text.primary"
        fontWeight={600}
        title={displayName}
        sx={{
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.35,
          wordBreak: 'break-word',
          maxWidth: '100%',
          fontSize: '0.7rem',
        }}
      >
        {displayName}
      </Typography>
      {attr ? (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <AttributeElementIcon attribute={attr} size={15} />
        </Box>
      ) : null}
    </Stack>
  );

  if (href) {
    return (
      <Box
        component={Link}
        href={href}
        prefetch={false}
        sx={{
          textDecoration: 'none',
          color: 'inherit',
          minWidth: 0,
          borderRadius: 1.25,
          border: '1px solid',
          borderColor: 'divider',
          display: 'block',
          bgcolor: (t) => alpha(t.palette.background.paper, 0.6),
          transition: 'background-color 0.2s, border-color 0.2s',
          '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.light' },
        }}
      >
        {body}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minWidth: 0,
        borderRadius: 1.25,
        border: '1px dashed',
        borderColor: 'divider',
      }}
    >
      {body}
    </Box>
  );
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

// ─── 솔로·듀오·트리오 공통 정렬(픽횟수/경기 수·승률 4가지) ─────────────

const MONSTER_STATS_SORT_ID = 'rta-monster-stats-sort';

const MonsterStatsSortSelect = memo(function MonsterStatsSortSelect({
  value,
  onChange,
}: {
  value: MonsterStatsSortKey;
  onChange: (next: MonsterStatsSortKey) => void;
}) {
  const handle = useCallback(
    (e: SelectChangeEvent<MonsterStatsSortKey>) => {
      blurFocusedMenuItem();
      onChange(e.target.value as MonsterStatsSortKey);
    },
    [onChange],
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        mb: 2,
        borderRadius: 2.5,
        px: { xs: 1.25, sm: 1.5 },
        py: 1.25,
        borderColor: 'divider',
        bgcolor: 'common.white',
      }}
    >
      <FormControl size="small" fullWidth>
        <InputLabel id={MONSTER_STATS_SORT_ID}>정렬</InputLabel>
        <Select<MonsterStatsSortKey>
          labelId={MONSTER_STATS_SORT_ID}
          label="정렬"
          value={value}
          onChange={handle}
          renderValue={(v) => monsterStatsSortOptionContent(v as MonsterStatsSortKey)}
          sx={RTA_OUTLINED_SELECT_FIELD_SX}
          slotProps={{
            input: {
              sx: RTA_OUTLINED_SELECT_INPUT_SLOT_SX,
              'aria-label': `정렬: ${MONSTER_STATS_SORT_LABEL[value]}`,
            },
          }}
          MenuProps={{
            ...RTA_SELECT_MENU_PROPS,
            slotProps: {
              ...RTA_SELECT_MENU_PROPS.slotProps,
              paper: { sx: { maxHeight: 360, bgcolor: 'common.white' } },
            },
          }}
        >
          {MONSTER_STATS_SORT_KEYS.map((k) => (
            <MenuItem key={k} value={k} aria-label={MONSTER_STATS_SORT_LABEL[k]}>
              {monsterStatsSortOptionContent(k)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Paper>
  );
});

const SoloStatCard = memo(function SoloStatCard({ rank, stat }: { rank: number; stat: MonsterStats }) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
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
        <Stack direction="row" alignItems="flex-start" spacing={1.5}>
          <Typography
            component="span"
            sx={{
              fontWeight: 900,
              fontSize: '0.8rem',
              color: 'text.secondary',
              minWidth: 30,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.2,
              pt: 0.25,
            }}
          >
            #{rank}
          </Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <MonsterCell
              name={stat.monster_name}
              image={stat.monster_image}
              elemental={stat.monster_elemental}
              monsterId={stat.monster_id}
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
              {toNum(stat.pick_count).toLocaleString()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
              픽률
            </Typography>
            <Typography fontWeight={800} sx={{ ...NUMERIC_CELL_SX, fontSize: '0.95rem' }}>
              {formatPercentage(stat.pick_rate)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
              승률
            </Typography>
            <Typography fontWeight={800} sx={{ ...NUMERIC_CELL_SX, fontSize: '0.95rem' }}>
              {formatPercentage(stat.win_rate)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
              벤율
            </Typography>
            <Typography fontWeight={800} sx={{ ...NUMERIC_CELL_SX, fontSize: '0.95rem' }}>
              {formatPercentage(stat.ban_rate)}
            </Typography>
          </Box>
        </Box>
      </Stack>
    </Paper>
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
        p: { xs: 1.75, sm: 2.25 },
        background: (t) =>
          `linear-gradient(120deg, ${alpha(t.palette.success.main, 0.04)} 0%, ${alpha(t.palette.background.paper, 1)} 40%)`,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: (t) => `0 8px 28px ${alpha(t.palette.common.black, 0.08)}`,
        },
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', md: 'center' }}
      >
        <Stack direction="row" alignItems="flex-start" spacing={1.5} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <Typography
            component="span"
            sx={{
              fontWeight: 900,
              fontSize: '0.8rem',
              color: 'text.secondary',
              minWidth: 30,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.2,
              pt: 0.25,
            }}
          >
            #{rank}
          </Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
        </Stack>
        <Stack
          direction="row"
          spacing={2.5}
          sx={{
            flexShrink: 0,
            justifyContent: { xs: 'space-between', md: 'flex-end' },
            width: { xs: '100%', md: 'auto' },
            minWidth: { md: 200 },
            pl: { xs: 0, md: 0 },
            borderTop: { xs: '1px solid', md: 'none' },
            borderColor: 'divider',
            pt: { xs: 1.5, md: 0 },
          }}
        >
          <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
              경기 수
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

// ─── LoadMoreButton ───────────────────────────────────────────────────────────

const LoadMoreButton = memo(function LoadMoreButton({
  hasMore,
  isFetching,
  onLoadMore,
  isNarrow,
}: {
  hasMore: boolean;
  isFetching: boolean;
  onLoadMore: () => void;
  isNarrow: boolean;
}) {
  if (!hasMore && !isFetching) return null;
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
      <Button
        variant="outlined"
        size={isNarrow ? 'small' : 'medium'}
        onClick={onLoadMore}
        disabled={isFetching}
        startIcon={isFetching ? <CircularProgress size={16} thickness={4} /> : undefined}
        sx={(theme) => ({
          px: 5,
          borderRadius: 2,
          fontWeight: 700,
          borderColor: `${theme.palette.primary.main}80`,
          '&:hover': { borderColor: theme.palette.primary.main },
        })}
      >
        {isFetching ? '불러오는 중…' : '더보기'}
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
  const queryClient = useQueryClient();
  const tab = useMemo(() => tabFromPathname(pathname), [pathname]);

  // Season
  const { data: seasonsData } = useRtaSeasonsContext();
  const { seasonSelectValue, seasonIdForApi, setSeason, seasonOptions } = useRtaSeasonSelect(seasonsData);

  // Load-more offsets
  const [statsOffset, setStatsOffset] = useState(0);
  const [duoOffset, setDuoOffset] = useState(0);
  const [trioOffset, setTrioOffset] = useState(0);

  // Accumulated rows
  const [allSoloStats, setAllSoloStats] = useState<MonsterStats[]>([]);
  const [allDuoStats, setAllDuoStats] = useState<DuoComboStat[]>([]);
  const [allTrioStats, setAllTrioStats] = useState<TrioComboStat[]>([]);

  // Persisted hasMore (prevents button flash during fetch)
  const [statsHasMore, setStatsHasMore] = useState(false);
  const [duoHasMore, setDuoHasMore] = useState(false);
  const [trioHasMore, setTrioHasMore] = useState(false);

  // Filters
  const [tierSelection, setTierSelection] = useState('');
  const [soloSearch, setSoloSearch] = useState('');
  const [elementFilter, setElementFilter] = useState<ElementFilterValue>('all');

  // 솔로·듀오·트리오 공통: 픽횟수(듀오·트리오는 경기 수)·승률 × 오름·내림
  const [monsterStatsSort, setMonsterStatsSort] = useState<MonsterStatsSortKey>('pick_count_desc');

  // Reset all on filter change
  useEffect(() => {
    setStatsOffset(0);
    setDuoOffset(0);
    setTrioOffset(0);
    setAllSoloStats([]);
    setAllDuoStats([]);
    setAllTrioStats([]);
    setStatsHasMore(false);
    setDuoHasMore(false);
    setTrioHasMore(false);
  }, [tierSelection, seasonSelectValue]);

  // Data
  const { data: gradeRules = [], isLoading: tierRulesLoading } = useRtaRatingGradeRules();

  const { data: monsterCatalog = [], isLoading: catalogLoading } = useApiPostQuery<MonsterOption[]>(
    '/summonerswar/monster-list',
    {},
    {
      /** md 이상: 좌측 검색·속성·썸네일. 모바일은 시즌/티어·목록·정렬만 */
      enabled: tab === 0 && !isNarrow,
      select: (raw) => normalizeMonsterList(raw),
      staleTime: 60 * 60 * 1000,
      gcTime: 2 * 60 * 60 * 1000,
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

  /** 몬스터 통계 화면에서 시즌·티어가 정해지면 듀오·트리오 1페이지를 200ms 후 백그라운드 prefetch */
  useEffect(() => {
    if (!seasonSelectValue?.trim() && (seasonIdForApi == null || seasonIdForApi < 1)) return;
    const t = window.setTimeout(() => {
      const base = {
        limit: PAGE_SIZE,
        offset: 0,
        seasonCode: seasonSelectValue,
        seasonId: seasonIdForApi,
        ...tierFilterBody,
      };
      const opts = {
        staleTime: RTA_MONSTER_STATS_STALE_MS,
        gcTime: RTA_MONSTER_STATS_GC_MS,
      };
      void queryClient.prefetchQuery({
        queryKey: getRtaMonsterStatsQueryKey({ ...base, type: 'duo' }),
        queryFn: () => fetchRtaMonsterStats({ ...base, type: 'duo' }),
        ...opts,
      });
      void queryClient.prefetchQuery({
        queryKey: getRtaMonsterStatsQueryKey({ ...base, type: 'trio' }),
        queryFn: () => fetchRtaMonsterStats({ ...base, type: 'trio' }),
        ...opts,
      });
    }, 200);
    return () => {
      clearTimeout(t);
    };
  }, [queryClient, seasonSelectValue, seasonIdForApi, tierFilterBody]);

  const { data: soloData, isLoading: soloLoading, isFetching: soloFetching, error: soloError } = useRtaMonsterStats({ ...commonParams, type: 'solo', offset: statsOffset, enabled: tab === 0 });
  const { data: duoData,  isLoading: duoLoading,  isFetching: duoFetching  } = useRtaMonsterStats({ ...commonParams, type: 'duo',  offset: duoOffset,  enabled: tab === 1 });
  const { data: trioData, isLoading: trioLoading, isFetching: trioFetching } = useRtaMonsterStats({ ...commonParams, type: 'trio', offset: trioOffset, enabled: tab === 2 });

  const isLoading = tab === 0 ? soloLoading : tab === 1 ? duoLoading : trioLoading;
  const isFetching = tab === 0 ? soloFetching : tab === 1 ? duoFetching : trioFetching;
  const error = soloError;

  // Accumulate solo data
  useEffect(() => {
    if (!soloData) return;
    const newRows = (soloData.rows as MonsterStats[] ?? []).map(normalizeMonsterStat);
    if (statsOffset === 0) {
      setAllSoloStats(newRows);
    } else {
      setAllSoloStats((prev) => [...prev, ...newRows]);
    }
    setStatsHasMore(Boolean(soloData.has_more));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soloData]);

  // Accumulate duo data
  useEffect(() => {
    if (!duoData) return;
    const newRows = (duoData.rows as DuoComboStat[] ?? []).map(normalizeComboStat);
    if (duoOffset === 0) {
      setAllDuoStats(newRows);
    } else {
      setAllDuoStats((prev) => [...prev, ...newRows]);
    }
    setDuoHasMore(Boolean(duoData.has_more));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duoData]);

  // Accumulate trio data
  useEffect(() => {
    if (!trioData) return;
    const newRows = (trioData.rows as TrioComboStat[] ?? []).map(normalizeComboStat);
    if (trioOffset === 0) {
      setAllTrioStats(newRows);
    } else {
      setAllTrioStats((prev) => [...prev, ...newRows]);
    }
    setTrioHasMore(Boolean(trioData.has_more));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trioData]);

  // Sorted data (솔로: 픽횟수 또는 승률만)
  const sortedStats = useMemo(() => {
    if (allSoloStats.length === 0) return [];
    const { field, order } = monsterStatsSortToSoloField(monsterStatsSort);
    const mul = order === 'asc' ? 1 : -1;
    return [...allSoloStats].sort((a, b) => {
      const aVal = (a as unknown as Record<string, number>)[field] ?? 0;
      const bVal = (b as unknown as Record<string, number>)[field] ?? 0;
      return mul * (aVal - bVal);
    });
  }, [allSoloStats, monsterStatsSort]);

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

  const sortedDuo = useMemo(() => {
    const { field, order } = monsterStatsSortToComboField(monsterStatsSort);
    return sortCombo(allDuoStats, field, order);
  }, [allDuoStats, monsterStatsSort]);

  const sortedTrio = useMemo(() => {
    const { field, order } = monsterStatsSortToComboField(monsterStatsSort);
    return sortCombo(allTrioStats, field, order);
  }, [allTrioStats, monsterStatsSort]);

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
  // 더보기(load-more) 중에는 누적 데이터가 있으므로 전체 스피너를 띄우지 않는다.
  const hasAnyAccumulatedData = allSoloStats.length > 0 || allDuoStats.length > 0 || allTrioStats.length > 0;

  if (isLoading && !hasAnyAccumulatedData) {
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
          <Tab icon={<PersonIcon fontSize="small" />}     iconPosition="start" label="솔로" />
          <Tab icon={<Diversity3Icon fontSize="small" />} iconPosition="start" label="듀오" />
          <Tab icon={<GroupsIcon fontSize="small" />}     iconPosition="start" label="트리오" />
        </Tabs>
      </Paper>

      {/* ── Solo Tab: PC 좌(검색·필터·썸네일) / 우(시즌·티어·테이블) ── */}
      {tab === 0 && (
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 2.5, md: 3 }}
          alignItems="stretch"
          sx={{ width: '100%' }}
        >
          {/* 좌측: 검색 → 상세 조건 → 몬스터 썸네일 3열 */}
          <Box
            id="search-hero"
            sx={{
              display: { xs: 'none', md: 'block' },
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
              <Stack
                direction="column"
                spacing={2}
                className="search-detail-split"
                sx={{ mb: soloCatalogFiltered.length > 0 || catalogLoading ? 2 : 0 }}
              >
                <Box className="serchbox-wrap" sx={{ width: '100%' }}>
                  <Typography
                    component="h3"
                    sx={{ m: 0, mb: 1, fontSize: { xs: '0.85rem', sm: '1rem' }, fontWeight: 800 }}
                  >
                    검색
                  </Typography>
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
                      <Button
                        type="submit"
                        variant="contained"
                        size="medium"
                        className="search-button"
                        sx={{ flexShrink: 0, minWidth: { xs: '100%', sm: 88, md: '100%' } }}
                      >
                        검색
                      </Button>
                    </Stack>
                  </Box>
                </Box>

                <Box className="detail-filter" sx={{ width: '100%', textAlign: 'left' }}>
                  <Typography
                    component="h3"
                    sx={{ m: 0, mb: 1, fontSize: { xs: '0.85rem', sm: '1rem' }, fontWeight: 800 }}
                  >
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
                        '& .MuiToggleButton-root': { minWidth: { xs: 36, sm: 44 } },
                      }}
                    >
                      <ToggleButton value="all" sx={{ px: { xs: 1, sm: 1.5 }, textTransform: 'none', fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                        전체
                      </ToggleButton>
                      {ELEMENT_TOGGLE_ORDER.map((el) => (
                        <ToggleButton key={el} value={el} sx={{ px: { xs: 1, sm: 1.25 } }} aria-label={el}>
                          <AttributeElementIcon attribute={el} size={isNarrow ? 20 : 22} />
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  </Box>
                </Box>
              </Stack>

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
                    gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
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
                            prefetch={false}
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

            <MonsterStatsSortSelect value={monsterStatsSort} onChange={setMonsterStatsSort} />

            {sortedStats.length === 0 ? (
              <StatsEmptyState
                title="표시할 통계가 없습니다"
                description="경기 수가 100판 미만인 몬스터는 목록에서 제외합니다. 리플레이가 부족하거나 집계가 아직 반영되지 않았을 수 있습니다. 잠시 후 다시 확인해 주세요."
              />
            ) : isNarrow ? (
              <Stack spacing={1.5}>
                {sortedStats.map((stat, idx) => (
                  <SoloStatCard
                    key={stat.monster_id ?? stat.monster_name}
                    rank={idx + 1}
                    stat={stat}
                  />
                ))}
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
                      <TableCell align="center" sx={{ ...TABLE_HEAD_CELL_SX, width: 52 }}>#</TableCell>
                      <TableCell align="left" sx={{ ...TABLE_HEAD_CELL_SX }}>
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedStats.map((stat, idx) => {
                      const rank = idx + 1;
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

            <LoadMoreButton
              hasMore={statsHasMore}
              isFetching={soloFetching}
              onLoadMore={() => setStatsOffset((prev) => prev + PAGE_SIZE)}
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
          <MonsterStatsSortSelect value={monsterStatsSort} onChange={setMonsterStatsSort} />

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
                  rank={i + 1}
                  matchCount={row.match_count}
                  winRate={row.win_rate}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: 1,
                      width: '100%',
                    }}
                  >
                    <ComboMonsterTile
                      name={row.monster_name_1}
                      image={pickComboMonsterImage(row, 1)}
                      elemental={row.monster_elemental_1}
                      monsterId={row.monster_id_1}
                    />
                    <ComboMonsterTile
                      name={row.monster_name_2}
                      image={pickComboMonsterImage(row, 2)}
                      elemental={row.monster_elemental_2}
                      monsterId={row.monster_id_2}
                    />
                  </Box>
                </ComboStatRow>
              ))}
            </Stack>
          )}

          <LoadMoreButton
              hasMore={duoHasMore}
              isFetching={duoFetching}
              onLoadMore={() => setDuoOffset((prev) => prev + PAGE_SIZE)}
              isNarrow={isNarrow}
            />
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
          <MonsterStatsSortSelect value={monsterStatsSort} onChange={setMonsterStatsSort} />

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
                  rank={i + 1}
                  matchCount={row.match_count}
                  winRate={row.win_rate}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: 1,
                      width: '100%',
                    }}
                  >
                    <ComboMonsterTile
                      name={row.monster_name_1}
                      image={pickComboMonsterImage(row, 1)}
                      elemental={row.monster_elemental_1}
                      monsterId={row.monster_id_1}
                    />
                    <ComboMonsterTile
                      name={row.monster_name_2}
                      image={pickComboMonsterImage(row, 2)}
                      elemental={row.monster_elemental_2}
                      monsterId={row.monster_id_2}
                    />
                    <ComboMonsterTile
                      name={row.monster_name_3}
                      image={pickComboMonsterImage(row, 3)}
                      elemental={row.monster_elemental_3}
                      monsterId={row.monster_id_3}
                    />
                  </Box>
                </ComboStatRow>
              ))}
            </Stack>
          )}

          <LoadMoreButton
              hasMore={trioHasMore}
              isFetching={trioFetching}
              onLoadMore={() => setTrioOffset((prev) => prev + PAGE_SIZE)}
              isNarrow={isNarrow}
            />
        </>
      )}
    </Container>
  );
}
