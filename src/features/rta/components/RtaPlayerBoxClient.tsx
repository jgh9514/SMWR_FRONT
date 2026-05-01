'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { SyntheticEvent } from 'react';
import AttributeElementIcon from '@/shared/ui/attribute-element-icon/AttributeElementIcon';
import type { AttributeType } from '@/features/siege/types/monster';
import { parseMonsterElemental } from '@/shared/utils/monsterElemental';
import { getRenderableImageUrl } from '@/shared/utils/image';
import { useRtaPlayerOwnedBox } from '@/features/rta/hooks/useRtaData';
import type { RtaPlayerOwnedBoxRow } from '@/features/rta/types/rta';

const MONSTER_DETAIL_BASE = '/monster-detail';

/** RTA 속성 필터 순서 — RtaMonsterStatsClient와 동일 */
const ELEMENT_TOGGLE_ORDER: AttributeType[] = ['fire', 'water', 'wind', 'light', 'dark'];

/** 보유 몬 목록 초기 속성 선택: 빛 + 어둠 */
const DEFAULT_ELEMENT_SELECTION: AttributeType[] = ['light', 'dark'];

/** 자연별(1~5) 토글 순서 */
const NATURAL_STAR_VALUES = [1, 2, 3, 4, 5] as const;
type NaturalStarGrade = (typeof NATURAL_STAR_VALUES)[number];

/** 초기 성급: 5별만 */
const DEFAULT_STAR_SELECTION: readonly NaturalStarGrade[] = [5];

function n(v: unknown): number {
  if (v == null || v === '') return 0;
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function parseNaturalStars(v: unknown): number | null {
  if (v == null || v === '') return null;
  const x = Number(v);
  if (!Number.isFinite(x)) return null;
  const s = Math.round(x);
  if (s >= 1 && s <= 5) return s;
  return null;
}

function rowFromApi(r: RtaPlayerOwnedBoxRow & Record<string, unknown>): RtaPlayerOwnedBoxRow {
  return {
    unit_master_id: n(r.unit_master_id),
    monster_name: r.monster_name != null ? String(r.monster_name) : null,
    monster_image: r.monster_image != null ? String(r.monster_image) : null,
    monster_elemental: r.monster_elemental != null ? String(r.monster_elemental) : null,
    natural_stars: parseNaturalStars(r.natural_stars),
  };
}

function rtaMonsterDetailHref(unitMasterId: number): string {
  return `${MONSTER_DETAIL_BASE}/${encodeURIComponent(String(unitMasterId))}`;
}

/** 모스통 솔로 카탈로그(filterlist-wrap)와 동격: 썸네일·이름·속성 아이콘 */
function OwnedMonsterGridItem({ row }: { row: RtaPlayerOwnedBoxRow }) {
  const label = row.monster_name?.trim() || `ID ${row.unit_master_id}`;
  const href = rtaMonsterDetailHref(row.unit_master_id);
  const attr = parseMonsterElemental(row.monster_elemental);

  const inner = (
    <Stack alignItems="center" spacing={0.4} sx={{ width: '100%', py: 0.35 }}>
      <Avatar
        src={getRenderableImageUrl(row.monster_image)}
        alt={label}
        variant="rounded"
        sx={{
          width: { xs: 44, sm: 48 },
          height: { xs: 44, sm: 48 },
          flexShrink: 0,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {label.charAt(0)}
      </Avatar>
      <Typography
        variant="caption"
        color="text.secondary"
        title={label}
        sx={{
          width: '100%',
          textAlign: 'center',
          lineHeight: 1.25,
          fontSize: '0.65rem',
          fontWeight: 600,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'break-word',
        }}
      >
        {label}
      </Typography>
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
        {attr ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', lineHeight: 0 }}>
            <AttributeElementIcon attribute={attr} size={15} />
          </Box>
        ) : null}
        {row.natural_stars != null ? (
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, fontSize: '0.62rem', lineHeight: 1 }}>
            {row.natural_stars}별
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );

  return (
    <Box component="li" sx={{ listStyle: 'none', minWidth: 0 }}>
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
          bgcolor: 'background.paper',
          transition: 'background-color 0.15s, border-color 0.15s',
          '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.light' },
        }}
      >
        {inner}
      </Box>
    </Box>
  );
}

export default function RtaPlayerBoxClient() {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));

  const params = useParams<{ wizardId: string }>();
  const wizardId = String(params?.wizardId ?? '').trim();

  const { data, isLoading, error, isFetching } = useRtaPlayerOwnedBox(wizardId, {
    enabled: Boolean(wizardId),
  });

  const rows = (data?.rows ?? []).map((r) => rowFromApi(r as RtaPlayerOwnedBoxRow & Record<string, unknown>));

  const [selectedElements, setSelectedElements] = useState<Set<AttributeType>>(
    () => new Set(DEFAULT_ELEMENT_SELECTION),
  );

  const [selectedStars, setSelectedStars] = useState<Set<NaturalStarGrade>>(
    () => new Set(DEFAULT_STAR_SELECTION),
  );

  const selectedArray = useMemo(() => ELEMENT_TOGGLE_ORDER.filter((el) => selectedElements.has(el)), [selectedElements]);

  const selectedStarArray = useMemo(
    () => NATURAL_STAR_VALUES.filter((s) => selectedStars.has(s)),
    [selectedStars],
  );

  const handleElementFilterChange = (_: SyntheticEvent, next: AttributeType[]) => {
    setSelectedElements(next.length === 0 ? new Set() : new Set(next));
  };

  const handleStarFilterChange = (_: SyntheticEvent, next: NaturalStarGrade[]) => {
    setSelectedStars(next.length === 0 ? new Set() : new Set(next));
  };

  const selectAllElements = () => setSelectedElements(new Set(ELEMENT_TOGGLE_ORDER));

  const selectAllStars = () => setSelectedStars(new Set(NATURAL_STAR_VALUES));

  const filteredRows = useMemo(() => {
    if (selectedElements.size === 0 || selectedStars.size === 0) return [];
    return rows.filter((row) => {
      const el = parseMonsterElemental(row.monster_elemental);
      if (el == null || !selectedElements.has(el)) return false;
      const st = row.natural_stars;
      return st != null && selectedStars.has(st as NaturalStarGrade);
    });
  }, [rows, selectedElements, selectedStars]);

  const sortByElementThenName = useMemo(() => {
    const orderIndex = Object.fromEntries(ELEMENT_TOGGLE_ORDER.map((el, i) => [el, i])) as Record<AttributeType, number>;
    return [...filteredRows].sort((a, b) => {
      const ea = parseMonsterElemental(a.monster_elemental);
      const eb = parseMonsterElemental(b.monster_elemental);
      const ia = ea != null ? orderIndex[ea] : 99;
      const ib = eb != null ? orderIndex[eb] : 99;
      if (ia !== ib) return ia - ib;
      const sa = a.natural_stars ?? 0;
      const sb = b.natural_stars ?? 0;
      if (sb !== sa) return sb - sa;
      const na = (a.monster_name ?? '').trim() || String(a.unit_master_id);
      const nb = (b.monster_name ?? '').trim() || String(b.unit_master_id);
      return na.localeCompare(nb, 'ko');
    });
  }, [filteredRows]);

  if (!wizardId) {
    return (
      <Typography variant="body2" color="text.secondary">
        위자드 ID가 없습니다.
      </Typography>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={36} />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error">
        {error.message || '불러오기에 실패했습니다.'}
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          보유 행이 없습니다. 수집된 RTA 리플레이에서 이 소환사가 픽·밴으로 사용한 기록이 없거나, 무거운 소환사 스냅 배치(RtaSummonerRankingAggJob) 실행 후 다시 확인해 주세요.
        </Typography>
      ) : (
        <>
          <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 1.5, sm: 2 }, overflow: 'visible' }}>
            <Stack spacing={2}>
              <Stack spacing={1.25}>
                <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' }, fontWeight: 800, m: 0 }}>
                  속성 필터
                </Typography>
                <Stack direction="row" flexWrap="wrap" alignItems="center" gap={{ xs: 1, sm: 1.25 }} sx={{ overflow: 'visible' }}>
                  <ToggleButtonGroup
                    value={selectedArray}
                    exclusive={false}
                    onChange={handleElementFilterChange}
                    aria-label="보유 몬스터 속성 필터"
                    size="small"
                    color="primary"
                    sx={{
                      flexWrap: 'wrap',
                      gap: 1,
                      overflow: 'visible',
                      py: 0.5,
                      /* flexWrap 시 grouped 음수 마진이 활성 테두리를 깎음 — 간격은 gap만 사용 */
                      '& .MuiToggleButtonGroup-grouped': {
                        margin: '0 !important',
                        borderRadius: '8px !important',
                        border: '1px solid',
                        borderColor: 'divider',
                      },
                      '& .MuiToggleButton-root': {
                        overflow: 'visible',
                        minWidth: { xs: 36, sm: 44 },
                        '&.Mui-selected': {
                          zIndex: 1,
                          position: 'relative',
                        },
                      },
                    }}
                  >
                    {ELEMENT_TOGGLE_ORDER.map((el) => (
                      <ToggleButton key={el} value={el} sx={{ px: { xs: 1, sm: 1.25 } }} aria-label={el}>
                        <AttributeElementIcon attribute={el} size={isNarrow ? 20 : 22} />
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                  <Button variant="text" size="small" sx={{ fontWeight: 700, flexShrink: 0 }} onClick={selectAllElements}>
                    모든 속성
                  </Button>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
                  기본은 빛·어둠입니다. 켜 둔 속성 중 하나와 일치하는 몬스터가 후보에 남습니다.
                </Typography>
              </Stack>

              <Divider flexItem />

              <Stack spacing={1.25}>
                <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' }, fontWeight: 800, m: 0 }}>
                  성급 필터 (자연별)
                </Typography>
                <Stack direction="row" flexWrap="wrap" alignItems="center" gap={{ xs: 1, sm: 1.25 }} sx={{ overflow: 'visible' }}>
                  <ToggleButtonGroup
                    value={selectedStarArray}
                    exclusive={false}
                    onChange={handleStarFilterChange}
                    aria-label="보유 몬스터 성급 필터"
                    size="small"
                    color="secondary"
                    sx={{
                      flexWrap: 'wrap',
                      gap: 1,
                      overflow: 'visible',
                      py: 0.5,
                      '& .MuiToggleButtonGroup-grouped': {
                        margin: '0 !important',
                        borderRadius: '8px !important',
                        border: '1px solid',
                        borderColor: 'divider',
                      },
                      '& .MuiToggleButton-root': {
                        overflow: 'visible',
                        minWidth: { xs: 36, sm: 40 },
                        px: 1,
                        '&.Mui-selected': {
                          zIndex: 1,
                          position: 'relative',
                        },
                      },
                    }}
                  >
                    {NATURAL_STAR_VALUES.map((sv) => (
                      <ToggleButton key={sv} value={sv} aria-label={`${sv}성`}>
                        <Typography variant="caption" fontWeight={800} sx={{ fontSize: { xs: '0.72rem', sm: '0.8125rem' } }}>
                          {sv}별
                        </Typography>
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                  <Button variant="text" size="small" sx={{ fontWeight: 700, flexShrink: 0 }} onClick={selectAllStars}>
                    모든 성급
                  </Button>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
                  기본은 5별만 선택합니다. 속성과 함께 적용되며(둘 다 만족), 메타가 없는 행은 성급으로 걸러집니다.
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          <Stack spacing={0.75}>
            {isFetching ? (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', minHeight: 20 }}>
                <CircularProgress size={16} />
              </Box>
            ) : null}

            {selectedElements.size === 0 ? (
              <Typography variant="body2" color="text.secondary">
                속성을 한 개 이상 선택해 주세요.
              </Typography>
            ) : selectedStars.size === 0 ? (
              <Typography variant="body2" color="text.secondary">
                성급을 한 개 이상 선택해 주세요.
              </Typography>
            ) : sortByElementThenName.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                선택한 속성·성급에 해당하는 보유 몬스터가 없습니다.
              </Typography>
            ) : (
              <Box
                className="filterlist-wrap"
                component="ul"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(2, minmax(0, 1fr))',
                    sm: 'repeat(3, minmax(0, 1fr))',
                    md: 'repeat(4, minmax(0, 1fr))',
                  },
                  gap: 1,
                  m: 0,
                  p: 0,
                  listStyle: 'none',
                  alignContent: 'start',
                }}
              >
                {sortByElementThenName.map((row) => (
                  <OwnedMonsterGridItem key={row.unit_master_id} row={row} />
                ))}
              </Box>
            )}
          </Stack>
        </>
      )}
    </Stack>
  );
}
