'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Card,
  CardContent,
  Collapse,
  Container,
  Drawer,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  InputAdornment,
  Button,
  Pagination,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import { AttributeElementIcon, PageHeader } from '@/shared/ui';
import { getRenderableImageUrl } from '@/shared/utils/image';
import type { MonsterOption } from '@/features/siege/hooks/useSiegeList';
import type { AttributeType } from '@/features/siege/types/monster';
import { monsterAwakenStepDigit, monsterEvolutionGroupKey } from '@/features/siege/lib/monsterIdEvolution';
import { normalizeMonsterList } from '@/features/siege/lib/normalizeMonsterOption';
import { apiClient } from '@/shared/lib/api/client';

const attributeLabels: Record<AttributeType, string> = {
  fire: '불',
  water: '물',
  wind: '바람',
  light: '빛',
  dark: '어둠',
};

/** 스카이아레나식 영문 속성 라벨 */
const elementTitleEn: Record<AttributeType, string> = {
  fire: 'Fire',
  water: 'Water',
  wind: 'Wind',
  light: 'Light',
  dark: 'Dark',
};

const elementTitleColor: Record<AttributeType, string> = {
  fire: '#ef5350',
  water: '#42a5f5',
  wind: '#66bb6a',
  light: '#ffb300',
  dark: '#ab47bc',
};

const attributes: AttributeType[] = ['fire', 'water', 'wind', 'light', 'dark'];

const ARCHETYPE_FILTERS = ['Attack', 'Defense', 'HP', 'Support'] as const;
const STAR_FILTERS = [1, 2, 3, 4, 5, 6] as const;

/** 몬스터 검색 — 한 페이지당 종(페어) 수 */
const MONSTER_SEARCH_PAGE_SIZE = 24;

/** 노말 / 1각 / 2각 썸네일 동일 크기 (px) */
const MONSTER_ICON_PX = 48;

/** 데빌몬 아이콘 (스킬업 옆) */
const DEVILMON_ICON_PX = 28;

/** 스킬업 수치 최대 2자리(tabular) 기준 고정 폭(px) */
const SKILL_UP_NUMBER_WIDTH_PX = 32;

const skillUpNumberSx = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: SKILL_UP_NUMBER_WIDTH_PX,
  minWidth: SKILL_UP_NUMBER_WIDTH_PX,
  maxWidth: SKILL_UP_NUMBER_WIDTH_PX,
  fontVariantNumeric: 'tabular-nums' as const,
  fontFeatureSettings: '"tnum"',
  flexShrink: 0,
  boxSizing: 'border-box' as const,
};

const MAX_STAR_ICONS = 6;

const iconTableCellSx = {
  width: 56,
  minWidth: 56,
  maxWidth: 56,
  px: 0.5,
  boxSizing: 'border-box' as const,
  verticalAlign: 'middle' as const,
};

/** PC 테이블 별 등급 열 — 정렬 화살표 포함 헤더 한 줄 */
const STAR_GRADE_COLUMN_WIDTH_PX = 140;
const starGradeColumnSx = {
  width: STAR_GRADE_COLUMN_WIDTH_PX,
  minWidth: STAR_GRADE_COLUMN_WIDTH_PX,
  whiteSpace: 'nowrap' as const,
  verticalAlign: 'middle' as const,
};

/** 상세 경로 — 빈 ID는 링크 없음 */
function monsterDetailHref(monsterId: string | undefined): string | null {
  const id = monsterId?.trim();
  if (!id) return null;
  return `/monster-detail/${encodeURIComponent(id)}`;
}

/**
 * monster_id 끝자리(속성) + 끝에서 두 번째(각성 단계)로 묶음.
 * 같은 그룹 안에서 각성 자리 숫자 오름차순 → [노말, 1차 각성, 2차 각성] 슬롯.
 */
function buildMonsterPairs(list: MonsterOption[]): MonsterPairRow[] {
  const byKey = new Map<string, MonsterOption[]>();
  for (const m of list) {
    const k = monsterEvolutionGroupKey(m.monster_id);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(m);
  }

  const pairs: MonsterPairRow[] = [];
  for (const [key, arr] of byKey) {
    const sorted = [...arr].sort((a, b) => {
      const da = monsterAwakenStepDigit(a.monster_id);
      const db = monsterAwakenStepDigit(b.monster_id);
      const na = da ?? 999;
      const nb = db ?? 999;
      if (na !== nb) return na - nb;
      return a.monster_id.localeCompare(b.monster_id);
    });
    pairs.push({
      key,
      normal: sorted[0],
      awakened: sorted[1],
      secondAwakening: sorted[2],
    });
  }
  return pairs;
}

type MonsterPairRow = {
  key: string;
  normal?: MonsterOption;
  awakened?: MonsterOption;
  secondAwakening?: MonsterOption;
};

const getMonsterAttribute = (monsterElemental: string | undefined): AttributeType | null => {
  if (!monsterElemental) return null;
  const elemental = monsterElemental.toLowerCase();
  if (elemental === 'fire' || elemental === '불') return 'fire';
  if (elemental === 'water' || elemental === '물') return 'water';
  if (elemental === 'wind' || elemental === '바람') return 'wind';
  if (elemental === 'light' || elemental === '빛') return 'light';
  if (elemental === 'dark' || elemental === '어둠') return 'dark';
  return null;
};

const getStarCount = (monster: MonsterOption | undefined): number | null => {
  if (monster === undefined) return null;
  if (monster.star === undefined || monster.star === null) return null;
  const n = monster.star;
  if (Number.isNaN(n)) return null;
  return Math.min(MAX_STAR_ICONS, Math.max(0, Math.floor(n)));
};

/** 표시·정렬용 대표 몬스터 (최종 단계 우선) */
const primaryMonster = (row: MonsterPairRow): MonsterOption | undefined =>
  row.secondAwakening ?? row.awakened ?? row.normal;

type ElementFilter = 'all' | AttributeType;
type StarFilter = 'all' | (typeof STAR_FILTERS)[number];
type ArchetypeFilter = 'all' | (typeof ARCHETYPE_FILTERS)[number];

type SortKey = 'star' | 'monster' | 'awakened' | 'second' | 'essence' | 'skill';

interface MonsterSearchClientProps {
  monsterList: MonsterOption[];
  /** 목록에 없을 수 있어 서버에서 `/summonerswar/monster/info`로 조회한 URL */
  devilmonImageUrl: string;
}

const toggleBtnSx = (selected: boolean) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 0.5,
  px: 1.25,
  py: 0.75,
  minHeight: 36,
  borderRadius: 1,
  fontSize: '0.8125rem',
  fontWeight: selected ? 700 : 500,
  cursor: 'pointer',
  userSelect: 'none',
  border: '1px solid',
  borderColor: (t: { palette: { divider: string; primary: { main: string } } }) =>
    selected ? t.palette.primary.main : t.palette.divider,
  bgcolor: (t: { palette: { mode: string; primary: { main: string }; action: { selected: string } } }) =>
    selected
      ? t.palette.mode === 'dark'
        ? 'rgba(25, 118, 210, 0.22)'
        : 'rgba(25, 118, 210, 0.12)'
      : 'transparent',
  color: 'text.primary',
  transition: 'background-color 0.15s, border-color 0.15s',
  '&:hover': {
    borderColor: 'primary.main',
  },
});

function RatingPill({ star }: { star: number | null }) {
  if (star === null) {
    return (
      <Typography variant="caption" color="text.secondary">
        —
      </Typography>
    );
  }
  return (
    <Box
      className="rating-pill"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1.25,
        py: 0.35,
        borderRadius: 10,
        border: '1px solid',
        borderColor: 'warning.main',
        bgcolor: (t) =>
          t.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.12)' : 'rgba(255, 193, 7, 0.14)',
      }}
    >
      <Typography component="span" variant="body2" fontWeight={700}>
        {star}
      </Typography>
      <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
    </Box>
  );
}

function MonsterTitleBlock({
  m,
  titleClass,
}: {
  m: MonsterOption | undefined;
  titleClass?: string;
}) {
  if (!m) {
    return (
      <Typography variant="body2" color="text.disabled">
        —
      </Typography>
    );
  }
  const attr = getMonsterAttribute(m.monster_elemental);
  const elLabel = attr ? elementTitleEn[attr] : (m.monster_elemental ?? '');
  return (
    <Box className={titleClass}>
      {elLabel ? (
        <Typography
          component="span"
          className="element"
          variant="caption"
          sx={{
            display: 'block',
            fontWeight: 600,
            textTransform: 'capitalize',
            color: attr ? elementTitleColor[attr] : 'text.secondary',
          }}
        >
          {elLabel}
        </Typography>
      ) : null}
      <Typography component="h3" variant="body2" fontWeight={700} sx={{ mt: 0, mb: 0, lineHeight: 1.35 }}>
        {m.kr_name}
      </Typography>
      {m.un_name ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
          {m.un_name}
        </Typography>
      ) : null}
    </Box>
  );
}

function MonsterIconCell({
  m,
  /** false면 데이터 없을 때 완전 빈 영역(— 없음) — 2차 각성 등 */
  showDashWhenEmpty = true,
  sizePx = MONSTER_ICON_PX,
}: {
  m: MonsterOption | undefined;
  showDashWhenEmpty?: boolean;
  sizePx?: number;
}) {
  const frameSx = {
    width: sizePx,
    height: sizePx,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as const;

  if (!m) {
    if (!showDashWhenEmpty) {
      return <Box sx={frameSx} />;
    }
    return (
      <Typography variant="caption" color="text.disabled" align="center" display="block">
        —
      </Typography>
    );
  }
  const href = monsterDetailHref(m.monster_id);
  const img = (
    <Box
      component="img"
      src={getRenderableImageUrl(m.image_url)}
      alt=""
      sx={{
        width: sizePx,
        height: sizePx,
        objectFit: 'contain',
        display: 'block',
      }}
    />
  );
  if (!href) {
    return <Box sx={frameSx}>{img}</Box>;
  }
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: sizePx,
        height: sizePx,
        flexShrink: 0,
      }}
    >
      {img}
    </Link>
  );
}

export default function MonsterSearchClient({ monsterList, devilmonImageUrl }: MonsterSearchClientProps) {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [elementFilter, setElementFilter] = useState<ElementFilter>('all');
  const [starFilter, setStarFilter] = useState<StarFilter>('all');
  const [archetypeFilter, setArchetypeFilter] = useState<ArchetypeFilter>('all');
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('monster');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  /** SSR에서 API 실패·빈 캐시 시 브라우저에서 동일 API로 재시도 */
  const [clientMonsterList, setClientMonsterList] = useState<MonsterOption[] | undefined>(undefined);
  const [clientFetchError, setClientFetchError] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    if (monsterList.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = await apiClient.post<unknown[]>('/summonerswar/monster-list', {});
        const normalized = normalizeMonsterList(raw);
        if (!cancelled) {
          setClientFetchError(false);
          setClientMonsterList(normalized);
        }
      } catch {
        if (!cancelled) {
          setClientFetchError(true);
          setClientMonsterList([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [monsterList.length]);

  const effectiveMonsterList = useMemo(() => {
    if (monsterList.length > 0) return monsterList;
    if (clientMonsterList !== undefined) return clientMonsterList;
    return [];
  }, [monsterList, clientMonsterList]);

  const isMonsterListLoading = monsterList.length === 0 && clientMonsterList === undefined && !clientFetchError;

  const activeFilterCount =
    (elementFilter !== 'all' ? 1 : 0) +
    (starFilter !== 'all' ? 1 : 0) +
    (archetypeFilter !== 'all' ? 1 : 0);

  const filterSummaryShort = useMemo(() => {
    const parts: string[] = [];
    if (elementFilter !== 'all') parts.push(attributeLabels[elementFilter]);
    if (starFilter !== 'all') parts.push(`${starFilter}성`);
    if (archetypeFilter !== 'all') parts.push(archetypeFilter);
    return parts.length ? parts.join(' · ') : '';
  }, [elementFilter, starFilter, archetypeFilter]);

  const resetFilters = () => {
    setElementFilter('all');
    setStarFilter('all');
    setArchetypeFilter('all');
  };

  const pairs = useMemo(() => buildMonsterPairs(effectiveMonsterList), [effectiveMonsterList]);

  const filteredPairs = useMemo(() => {
    const keyword = searchKeyword.toLowerCase().trim();

    const textMatch = (m: MonsterOption | undefined): boolean => {
      if (!m) return false;
      return (
        m.kr_name.toLowerCase().includes(keyword) ||
        m.un_name.toLowerCase().includes(keyword) ||
        m.monster_id.toLowerCase().includes(keyword)
      );
    };

    return pairs.filter((row) => {
      const n = row.normal;
      const a = row.awakened;
      const s = row.secondAwakening;
      const p = primaryMonster(row);

      if (elementFilter !== 'all') {
        const el = getMonsterAttribute(
          n?.monster_elemental ?? a?.monster_elemental ?? s?.monster_elemental,
        );
        if (el !== elementFilter) return false;
      }
      if (starFilter !== 'all') {
        const sc = getStarCount(p);
        if (sc === null || sc !== starFilter) return false;
      }
      if (archetypeFilter !== 'all') {
        const arch = (p?.archetype ?? '').trim();
        if (!arch || arch.toLowerCase() !== archetypeFilter.toLowerCase()) return false;
      }
      if (!keyword) return true;
      return textMatch(n) || textMatch(a) || textMatch(s);
    });
  }, [pairs, searchKeyword, elementFilter, starFilter, archetypeFilter]);

  const sortedPairs = useMemo(() => {
    const rows = [...filteredPairs];
    const dir = sortDir === 'asc' ? 1 : -1;

    const essenceOf = (row: MonsterPairRow) =>
      row.secondAwakening?.awaken_bonus?.trim() ||
      row.awakened?.awaken_bonus?.trim() ||
      row.normal?.awaken_bonus?.trim() ||
      '';
    const skillOf = (row: MonsterPairRow) =>
      row.secondAwakening?.skill_ups_to_max ??
      row.awakened?.skill_ups_to_max ??
      row.normal?.skill_ups_to_max ??
      -1;

    rows.sort((ra, rb) => {
      const na = ra.normal;
      const aa = ra.awakened;
      const sa = ra.secondAwakening;
      const nb = rb.normal;
      const ab = rb.awakened;
      const sb = rb.secondAwakening;
      let cmp = 0;
      switch (sortKey) {
        case 'star':
          cmp = (primaryMonster(ra)?.star ?? -1) - (primaryMonster(rb)?.star ?? -1);
          break;
        case 'monster':
          cmp = (na?.kr_name ?? '').localeCompare(nb?.kr_name ?? '', 'ko');
          break;
        case 'awakened':
          cmp = (aa?.kr_name ?? '').localeCompare(ab?.kr_name ?? '', 'ko');
          break;
        case 'second':
          cmp = (sa?.kr_name ?? '').localeCompare(sb?.kr_name ?? '', 'ko');
          break;
        case 'essence':
          cmp = essenceOf(ra).localeCompare(essenceOf(rb), 'ko');
          break;
        case 'skill':
          cmp = skillOf(ra) - skillOf(rb);
          break;
        default:
          cmp = 0;
      }
      if (cmp !== 0) return cmp * dir;
      const ida = primaryMonster(ra)?.monster_id ?? '';
      const idb = primaryMonster(rb)?.monster_id ?? '';
      return ida.localeCompare(idb, undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });
    return rows;
  }, [filteredPairs, sortKey, sortDir]);

  const totalPairCount = sortedPairs.length;
  const totalPages = Math.max(1, Math.ceil(totalPairCount / MONSTER_SEARCH_PAGE_SIZE));

  useEffect(() => {
    queueMicrotask(() => {
      setPage(1);
    });
  }, [searchKeyword, elementFilter, starFilter, archetypeFilter]);

  useEffect(() => {
    queueMicrotask(() => {
      setPage((p) => Math.min(p, totalPages));
    });
  }, [totalPages]);

  const pagedPairs = useMemo(() => {
    const start = (page - 1) * MONSTER_SEARCH_PAGE_SIZE;
    return sortedPairs.slice(start, start + MONSTER_SEARCH_PAGE_SIZE);
  }, [sortedPairs, page]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const rangeStart = totalPairCount === 0 ? 0 : (page - 1) * MONSTER_SEARCH_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * MONSTER_SEARCH_PAGE_SIZE, totalPairCount);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const essenceText = (row: MonsterPairRow) =>
    row.secondAwakening?.awaken_bonus?.trim() ||
    row.awakened?.awaken_bonus?.trim() ||
    row.normal?.awaken_bonus?.trim() ||
    '';
  const skillText = (row: MonsterPairRow) => {
    const v =
      row.secondAwakening?.skill_ups_to_max ??
      row.awakened?.skill_ups_to_max ??
      row.normal?.skill_ups_to_max;
    return v != null ? v : null;
  };

  const filterControls = (
    <>
      <Box className="archive-ui-element element-glossary">
        <Button
          size="small"
          variant="outlined"
          onClick={() => setGlossaryOpen((o) => !o)}
        >
          {glossaryOpen ? '용어 숨기기' : '용어 보기'}
        </Button>
        <Collapse in={glossaryOpen}>
          <Box
            sx={{
              mt: 1.5,
              p: 1.5,
              borderRadius: 1,
              bgcolor: 'action.hover',
              typography: 'body2',
              color: 'text.secondary',
            }}
          >
            <strong>속성</strong>: 불·물·바람·빛·어둠. <strong>등급</strong>: 별(자연별).{' '}
            <strong>역할</strong>: 공격(Attack), 방어(Defense), 체력(HP), 지원(Support). 한 줄에{' '}
            <strong>노말 · 1차 각성 · 2차 각성</strong>을 나란히 둡니다.
          </Box>
        </Collapse>
      </Box>

      <Box className="archive-ui-element element-toggle">
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
          속성
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
          <Box
            component="span"
            onClick={() => setElementFilter('all')}
            sx={toggleBtnSx(elementFilter === 'all')}
          >
            전체
          </Box>
          {attributes.map((attr) => (
            <Box
              key={attr}
              component="span"
              onClick={() => setElementFilter(attr)}
              title={`${attributeLabels[attr]} 속성`}
              sx={toggleBtnSx(elementFilter === attr)}
            >
              <AttributeElementIcon attribute={attr} size={22} titleAccess={attributeLabels[attr]} />
            </Box>
          ))}
        </Box>
      </Box>

      <Box className="archive-ui-element element-toggle">
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
          등급
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
          <Box
            component="span"
            onClick={() => setStarFilter('all')}
            sx={toggleBtnSx(starFilter === 'all')}
          >
            전체
          </Box>
          {STAR_FILTERS.map((n) => (
            <Box
              key={n}
              component="span"
              onClick={() => setStarFilter(n)}
              sx={toggleBtnSx(starFilter === n)}
            >
              {n}{' '}
              <StarIcon sx={{ fontSize: 14, verticalAlign: 'middle', color: 'warning.main' }} />
            </Box>
          ))}
        </Box>
      </Box>

      <Box className="archive-ui-element element-toggle">
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
          역할
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
          <Box
            component="span"
            onClick={() => setArchetypeFilter('all')}
            sx={toggleBtnSx(archetypeFilter === 'all')}
          >
            전체
          </Box>
          {ARCHETYPE_FILTERS.map((t) => (
            <Box
              key={t}
              component="span"
              onClick={() => setArchetypeFilter(t)}
              sx={toggleBtnSx(archetypeFilter === t)}
            >
              {t}
            </Box>
          ))}
        </Box>
      </Box>
    </>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="lg">
        <PageHeader title="몬스터 목록" />

        <Card>
          <CardContent>
            <Box
              className="archive-ui archive-ui-local"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                mb: 2,
              }}
            >
              <Box className="archive-ui-element element-search">
                <TextField
                  className="local-search"
                  fullWidth
                  size="small"
                  placeholder="이름으로 검색…"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {!isMobile ? (
                filterControls
              ) : (
                <>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1,
                      alignItems: 'stretch',
                    }}
                  >
                    <Button
                      variant="outlined"
                      color={activeFilterCount > 0 ? 'primary' : 'inherit'}
                      startIcon={<FilterListIcon />}
                      onClick={() => setFilterDrawerOpen(true)}
                      sx={{
                        flex: 1,
                        justifyContent: 'flex-start',
                        py: 1.25,
                        textAlign: 'left',
                      }}
                    >
                      <Box sx={{ overflow: 'hidden' }}>
                        <Typography variant="body2" component="span" fontWeight={600} display="block">
                          검색 조건
                          {activeFilterCount > 0 ? ` · ${activeFilterCount}개` : ''}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          component="span"
                          display="block"
                          noWrap
                          sx={{ maxWidth: '100%' }}
                        >
                          {filterSummaryShort || '속성·등급·역할 선택'}
                        </Typography>
                      </Box>
                    </Button>
                    {activeFilterCount > 0 ? (
                      <Button
                        size="small"
                        variant="text"
                        onClick={resetFilters}
                        sx={{ alignSelf: 'center', flexShrink: 0, minWidth: 56 }}
                      >
                        초기화
                      </Button>
                    ) : null}
                  </Box>

                  <Drawer
                    anchor="bottom"
                    open={filterDrawerOpen}
                    onClose={() => setFilterDrawerOpen(false)}
                    PaperProps={{
                      sx: {
                        borderTopLeftRadius: 16,
                        borderTopRightRadius: 16,
                        maxHeight: 'min(90dvh, 900px)',
                        overflow: 'hidden',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        maxHeight: 'min(90dvh, 900px)',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          px: 2,
                          py: 1.5,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          flexShrink: 0,
                        }}
                      >
                        <Typography variant="subtitle1" fontWeight={700}>
                          검색 조건
                        </Typography>
                        <IconButton
                          aria-label="닫기"
                          onClick={() => setFilterDrawerOpen(false)}
                          edge="end"
                          size="small"
                        >
                          <CloseIcon />
                        </IconButton>
                      </Box>
                      <Box sx={{ overflow: 'auto', px: 2, py: 2, flex: 1 }}>{filterControls}</Box>
                      <Box
                        sx={{
                          px: 2,
                          pb: 2,
                          pt: 1,
                          flexShrink: 0,
                          borderTop: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Button
                          fullWidth
                          variant="contained"
                          size="large"
                          onClick={() => setFilterDrawerOpen(false)}
                        >
                          확인
                        </Button>
                      </Box>
                    </Box>
                  </Drawer>
                </>
              )}
            </Box>

            {isMonsterListLoading ? (
              <Box sx={{ textAlign: 'center', py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={36} />
                <Typography variant="body2" color="text.secondary">
                  몬스터 목록을 불러오는 중입니다…
                </Typography>
              </Box>
            ) : sortedPairs.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="body2" color="text.secondary">
                  {clientFetchError && !searchKeyword && elementFilter === 'all' && starFilter === 'all' && archetypeFilter === 'all'
                    ? '몬스터 목록을 불러오지 못했습니다. 백엔드 서버 실행 여부와 NEXT_PUBLIC_API_BASE_URL 설정을 확인해 주세요.'
                    : searchKeyword ||
                        elementFilter !== 'all' ||
                        starFilter !== 'all' ||
                        archetypeFilter !== 'all'
                      ? '조건에 맞는 몬스터가 없습니다.'
                      : '몬스터가 없습니다.'}
                </Typography>
              </Box>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  총 {totalPairCount}종
                  {totalPairCount > 0 ? (
                    <>
                      {' '}
                      · {rangeStart}–{rangeEnd} 표시
                    </>
                  ) : null}
                </Typography>

                {/* 데스크톱: 테이블 */}
                <TableContainer
                  sx={{
                    display: { xs: 'none', md: 'block' },
                    overflowX: 'auto',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Table
                    size="small"
                    stickyHeader
                    sx={{ minWidth: 1092, tableLayout: 'fixed' }}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell
                          sx={{ fontWeight: 700, cursor: 'pointer', ...starGradeColumnSx }}
                          onClick={() => handleSort('star')}
                        >
                          별 등급{sortIndicator('star')}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, ...iconTableCellSx }} />
                        <TableCell sx={{ fontWeight: 700, minWidth: 140 }} onClick={() => handleSort('monster')}>
                          노말{sortIndicator('monster')}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, ...iconTableCellSx }} />
                        <TableCell sx={{ fontWeight: 700, minWidth: 130 }} onClick={() => handleSort('awakened')}>
                          1차 각성{sortIndicator('awakened')}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, ...iconTableCellSx }} />
                        <TableCell sx={{ fontWeight: 700, minWidth: 130 }} onClick={() => handleSort('second')}>
                          2차 각성{sortIndicator('second')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, minWidth: 110 }} onClick={() => handleSort('essence')}>
                          각성 보너스{sortIndicator('essence')}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                          onClick={() => handleSort('skill')}
                        >
                          스킬업(최대){sortIndicator('skill')}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pagedPairs.map((row) => {
                        const star = getStarCount(primaryMonster(row));
                        const hrefNormal = row.normal ? monsterDetailHref(row.normal.monster_id) : null;
                        const hrefAwakened = row.awakened ? monsterDetailHref(row.awakened.monster_id) : null;
                        const hrefSecond = row.secondAwakening ? monsterDetailHref(row.secondAwakening.monster_id) : null;
                        return (
                          <TableRow
                            key={row.key}
                            hover
                            className="searchable"
                            sx={{ '&:last-child td': { border: 0 } }}
                          >
                            <TableCell sx={starGradeColumnSx}>
                              <RatingPill star={star} />
                            </TableCell>
                            <TableCell align="center" sx={iconTableCellSx}>
                              <MonsterIconCell m={row.normal} showDashWhenEmpty={false} sizePx={MONSTER_ICON_PX} />
                            </TableCell>
                            <TableCell sx={{ verticalAlign: 'middle' }}>
                              {row.normal ? (
                                hrefNormal ? (
                                  <Link
                                    href={hrefNormal}
                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                  >
                                    <MonsterTitleBlock m={row.normal} titleClass="title" />
                                  </Link>
                                ) : (
                                  <MonsterTitleBlock m={row.normal} titleClass="title" />
                                )
                              ) : null}
                            </TableCell>
                            <TableCell align="center" sx={iconTableCellSx}>
                              <MonsterIconCell m={row.awakened} showDashWhenEmpty={false} sizePx={MONSTER_ICON_PX} />
                            </TableCell>
                            <TableCell sx={{ verticalAlign: 'middle' }}>
                              {row.awakened ? (
                                hrefAwakened ? (
                                  <Link
                                    href={hrefAwakened}
                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                  >
                                    <MonsterTitleBlock m={row.awakened} titleClass="title" />
                                  </Link>
                                ) : (
                                  <MonsterTitleBlock m={row.awakened} titleClass="title" />
                                )
                              ) : null}
                            </TableCell>
                            <TableCell align="center" sx={iconTableCellSx}>
                              <MonsterIconCell
                                m={row.secondAwakening}
                                showDashWhenEmpty={false}
                                sizePx={MONSTER_ICON_PX}
                              />
                            </TableCell>
                            <TableCell sx={{ verticalAlign: 'middle' }}>
                              {row.secondAwakening ? (
                                hrefSecond ? (
                                  <Link
                                    href={hrefSecond}
                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                  >
                                    <MonsterTitleBlock m={row.secondAwakening} titleClass="title" />
                                  </Link>
                                ) : (
                                  <MonsterTitleBlock m={row.secondAwakening} titleClass="title" />
                                )
                              ) : null}
                            </TableCell>
                            <TableCell sx={{ verticalAlign: 'middle', maxWidth: 200 }}>
                              <Typography variant="body2" color="text.secondary" noWrap title={essenceText(row)}>
                                {essenceText(row) || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ verticalAlign: 'middle' }}>
                              <Box
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-end',
                                  gap: 0.75,
                                }}
                              >
                                <Box
                                  component="img"
                                  src={devilmonImageUrl}
                                  alt=""
                                  title="데빌몬"
                                  sx={{
                                    width: DEVILMON_ICON_PX,
                                    height: DEVILMON_ICON_PX,
                                    objectFit: 'contain',
                                    flexShrink: 0,
                                  }}
                                />
                                <Typography
                                  component="span"
                                  variant="body2"
                                  fontWeight={600}
                                  sx={skillUpNumberSx}
                                >
                                  {skillText(row) ?? '—'}
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* 모바일: 카드 */}
                <Box
                  sx={{
                    display: { xs: 'flex', md: 'none' },
                    flexDirection: 'column',
                    gap: 1.5,
                  }}
                >
                  {pagedPairs.map((row) => {
                    const star = getStarCount(primaryMonster(row));
                    const attr = getMonsterAttribute(
                      row.normal?.monster_elemental ??
                        row.awakened?.monster_elemental ??
                        row.secondAwakening?.monster_elemental,
                    );
                    return (
                      <Card
                        key={row.key}
                        variant="outlined"
                        className="searchable"
                        sx={{
                          borderRadius: 2,
                          overflow: 'hidden',
                          ...(attr && {
                            borderColor: elementTitleColor[attr],
                          }),
                        }}
                      >
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                            <RatingPill star={star} />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                              <Typography variant="caption" color="text.secondary">
                                스킬업
                              </Typography>
                              <Box
                                component="img"
                                src={devilmonImageUrl}
                                alt=""
                                title="데빌몬"
                                sx={{
                                  width: DEVILMON_ICON_PX,
                                  height: DEVILMON_ICON_PX,
                                  objectFit: 'contain',
                                  flexShrink: 0,
                                }}
                              />
                              <Box
                                sx={{
                                  ...skillUpNumberSx,
                                  minHeight: 36,
                                  borderRadius: 1,
                                  bgcolor: skillText(row) != null ? 'action.hover' : 'transparent',
                                  fontWeight: 700,
                                  fontSize: '0.95rem',
                                  color: skillText(row) != null ? 'text.primary' : 'text.disabled',
                                }}
                              >
                                {skillText(row) ?? '—'}
                              </Box>
                            </Box>
                          </Box>

                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                            {(
                              [
                                ...(row.normal ? [{ label: '노말' as const, m: row.normal }] : []),
                                ...(row.awakened ? [{ label: '1차 각성' as const, m: row.awakened }] : []),
                                ...(row.secondAwakening
                                  ? [{ label: '2차 각성' as const, m: row.secondAwakening }]
                                  : []),
                              ] as const
                            ).map(({ label, m }) => {
                              const titleHref = monsterDetailHref(m.monster_id);
                              return (
                              <Box
                                key={label}
                                sx={{
                                  display: 'grid',
                                  gridTemplateColumns: 'auto 1fr',
                                  gap: 1,
                                  alignItems: 'start',
                                }}
                              >
                                <MonsterIconCell m={m} showDashWhenEmpty={false} sizePx={MONSTER_ICON_PX} />
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {label}
                                  </Typography>
                                  {titleHref ? (
                                    <Link
                                      href={titleHref}
                                      style={{ textDecoration: 'none', color: 'inherit' }}
                                    >
                                      <MonsterTitleBlock m={m} />
                                    </Link>
                                  ) : (
                                    <MonsterTitleBlock m={m} />
                                  )}
                                </Box>
                              </Box>
                            );
                            })}
                          </Box>

                          {essenceText(row) ? (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}
                            >
                              {essenceText(row)}
                            </Typography>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>

                {totalPages > 1 ? (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      mt: 2,
                      pt: 1,
                      borderTop: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={(_, value) => setPage(value)}
                      color="primary"
                      showFirstButton
                      showLastButton
                      size="small"
                      siblingCount={1}
                      boundaryCount={1}
                      sx={{
                        '& .MuiPagination-ul': { flexWrap: 'wrap', justifyContent: 'center' },
                      }}
                    />
                  </Box>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
