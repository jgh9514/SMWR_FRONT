'use client';

import { memo, useCallback, useMemo, useState, type SyntheticEvent } from 'react';
import { useParams } from 'next/navigation';
import {
  Alert,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import SearchIcon from '@mui/icons-material/Search';
import type { AttributeType } from '@/features/siege/types/monster';
import { useRtaPlayerMonsterUsage } from '@/features/rta/hooks/useRtaData';
import { useRtaPlayerSeason } from '@/features/rta/context/RtaPlayerSeasonContext';
import type { RtaPlayerMonsterUsageRow } from '@/features/rta/types/rta';
import { parseMonsterElemental } from '@/shared/utils/monsterElemental';
import AttributeElementIcon from '@/shared/ui/attribute-element-icon/AttributeElementIcon';
import {
  MonsterCell,
  StatsEmptyState,
  TABLE_HEAD_CELL_SX,
  NUMERIC_CELL_SX,
  formatPercentage,
  toNum,
  monsterStatsSortToSoloField,
} from '@/features/rta/components/RtaMonsterStatsClient';
import type { MonsterStatsSortKey } from '@/features/rta/components/RtaMonsterStatsClient';
import { RTA_OUTLINED_SELECT_FIELD_SX, RTA_OUTLINED_SELECT_INPUT_SLOT_SX, RTA_SELECT_MENU_PROPS } from '@/features/rta/components/RtaSeasonTierSelectRow';
import { blurFocusedMenuItem } from '@/features/rta/rtaMenuModalProps';
import type { SelectChangeEvent } from '@mui/material/Select';

type ElementFilterValue = 'all' | AttributeType;
const ELEMENT_TOGGLE_ORDER: AttributeType[] = ['fire', 'water', 'wind', 'light', 'dark'];

function n(v: unknown): number {
  if (v == null || v === '') return 0;
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function rowFromApi(r: RtaPlayerMonsterUsageRow & Record<string, unknown>): RtaPlayerMonsterUsageRow {
  return {
    unit_master_id: n(r.unit_master_id),
    pick_cnt: n(r.pick_cnt),
    ban_cnt: n(r.ban_cnt),
    win_cnt: n(r.win_cnt),
    lose_cnt: n(r.lose_cnt),
    first_pick_cnt: n(r.first_pick_cnt),
    owned_copy_count: r.owned_copy_count == null ? null : n(r.owned_copy_count),
    monster_name: r.monster_name != null ? String(r.monster_name) : null,
    monster_image: r.monster_image != null ? String(r.monster_image) : null,
    monster_elemental: r.monster_elemental != null ? String(r.monster_elemental) : null,
    pick_rate_pct: r.pick_rate_pct == null ? null : n(r.pick_rate_pct),
    ban_rate_pct: r.ban_rate_pct == null ? null : n(r.ban_rate_pct),
    win_rate_pct: r.win_rate_pct == null ? null : n(r.win_rate_pct),
    first_pick_rate_pct: r.first_pick_rate_pct == null ? null : n(r.first_pick_rate_pct),
  };
}

function rowMatchesSearch(row: RtaPlayerMonsterUsageRow, q: string): boolean {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  const name = (row.monster_name ?? '').toLowerCase();
  return name.includes(t) || String(row.unit_master_id).includes(t);
}

function rowMatchesElement(row: RtaPlayerMonsterUsageRow, elementFilter: ElementFilterValue): boolean {
  if (elementFilter === 'all') return true;
  const attr = parseMonsterElemental(row.monster_elemental);
  return attr === elementFilter;
}

const PLAYER_PICKS_SORT_ID = 'rta-player-picks-sort';

/** 몬스터 통계(솔로)용 정렬 UI와 동일. 필드: pick_cnt ↔ win_rate_pct */
const PlayerPicksSortSelect = memo(function PlayerPicksSortSelect({
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
        <InputLabel id={PLAYER_PICKS_SORT_ID}>정렬</InputLabel>
        <Select<MonsterStatsSortKey>
          labelId={PLAYER_PICKS_SORT_ID}
          label="정렬"
          value={value}
          onChange={handle}
          sx={RTA_OUTLINED_SELECT_FIELD_SX}
          slotProps={{
            input: {
              sx: RTA_OUTLINED_SELECT_INPUT_SLOT_SX,
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
          <MenuItem value="pick_count_desc">픽횟수 · 내림차순</MenuItem>
          <MenuItem value="pick_count_asc">픽횟수 · 오름차순</MenuItem>
          <MenuItem value="win_rate_desc">승률 · 내림차순</MenuItem>
          <MenuItem value="win_rate_asc">승률 · 오름차순</MenuItem>
        </Select>
      </FormControl>
    </Paper>
  );
});

const PlayerPickStatCard = memo(function PlayerPickStatCard({ rank, row }: { rank: number; row: RtaPlayerMonsterUsageRow }) {
  const pr = toNum(row.pick_rate_pct);
  const wr = toNum(row.win_rate_pct);
  const br = toNum(row.ban_rate_pct);
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
              {toNum(row.pick_cnt).toLocaleString()}
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
              {formatPercentage(wr)}
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
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr' },
            gap: 1.25,
            pt: 1,
            borderTop: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
              선픽률
            </Typography>
            <Typography fontWeight={800} sx={{ ...NUMERIC_CELL_SX, fontSize: '0.9rem' }}>
              {row.first_pick_rate_pct == null ? '—' : formatPercentage(toNum(row.first_pick_rate_pct))}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
              보유
            </Typography>
            <Typography fontWeight={800} sx={{ ...NUMERIC_CELL_SX, fontSize: '0.9rem' }}>
              {row.owned_copy_count == null ? '—' : row.owned_copy_count}
            </Typography>
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
});

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

  const rawRows = (data?.rows ?? []).map((r) => rowFromApi(r as RtaPlayerMonsterUsageRow & Record<string, unknown>));
  const fight = data?.fight;

  const [soloSearch, setSoloSearch] = useState('');
  const [elementFilter, setElementFilter] = useState<ElementFilterValue>('all');
  const [monsterStatsSort, setMonsterStatsSort] = useState<MonsterStatsSortKey>('pick_count_desc');

  const handleElementFilterChange = useCallback(
    (_e: SyntheticEvent, v: ElementFilterValue | null) => {
      if (v != null) setElementFilter(v);
    },
    [],
  );

  const filtered = useMemo(() => {
    return rawRows.filter((r) => rowMatchesSearch(r, soloSearch) && rowMatchesElement(r, elementFilter));
  }, [rawRows, soloSearch, elementFilter]);

  const sortedStats = useMemo(() => {
    if (filtered.length === 0) return [];
    const { field, order } = monsterStatsSortToSoloField(monsterStatsSort);
    const mul = order === 'asc' ? 1 : -1;
    const key = field === 'pick_count' ? 'pick_cnt' : 'win_rate_pct';
    return [...filtered].sort((a, b) => {
      const aVal = toNum((a as unknown as Record<string, number>)[key]);
      const bVal = toNum((b as unknown as Record<string, number>)[key]);
      return mul * (aVal - bVal);
    });
  }, [filtered, monsterStatsSort]);

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
        <BarChartOutlinedIcon color="primary" fontSize="small" />
        <Typography variant="h6" component="h2" fontWeight={800}>
          사용 몬스터
        </Typography>
      </Stack>

      {error ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          통계를 최신으로 가져오지 못했습니다. 새로고침하거나 잠시 후 다시 시도해 주세요.
        </Alert>
      ) : null}

      {fight ? (
        <Paper
          elevation={0}
          variant="outlined"
          sx={{
            mb: 2.5,
            borderRadius: 2.5,
            p: 1.5,
            borderColor: 'divider',
            bgcolor: (t) => alpha(t.palette.background.paper, 0.9),
          }}
        >
          <Typography variant="caption" color="text.secondary" component="div">
            경기 <strong>{toNum(fight.match_cnt as unknown)}</strong> · 비밴 픽 {toNum(fight.non_ban_pick_cnt as unknown)} · 밴{' '}
            {toNum(fight.ban_event_cnt as unknown)}
          </Typography>
        </Paper>
      ) : (
        <Paper elevation={0} variant="outlined" sx={{ mb: 2.5, borderRadius: 2.5, p: 1.5, borderColor: 'warning.light' }}>
          <Typography variant="body2" color="warning.main">
            이 시즌·소환사에 대한 전투 스냅이 없습니다.{' '}
            <code style={{ fontSize: '0.85em' }}>rta_agg_summoner_season_fight_snap</code> 적재 후 픽률·밴률 분모가 잡힙니다.
          </Typography>
        </Paper>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2.5, md: 3 }} alignItems="stretch" sx={{ width: '100%' }}>
        <Box
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
            <Stack spacing={2}>
              <Box sx={{ width: '100%' }}>
                <Typography component="h3" sx={{ m: 0, mb: 1, fontSize: { xs: '0.85rem', sm: '1rem' }, fontWeight: 800 }}>
                  검색
                </Typography>
                <Box
                  component="form"
                  onSubmit={(e) => {
                    e.preventDefault();
                  }}
                >
                  <Stack direction="column" spacing={1.5}>
                    <TextField
                      size="small"
                      fullWidth
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
                    />
                    <Button type="submit" variant="contained" size="medium" sx={{ alignSelf: 'stretch' }}>
                      검색
                    </Button>
                  </Stack>
                </Box>
              </Box>
              <Box sx={{ width: '100%', textAlign: 'left' }}>
                <Typography component="h3" sx={{ m: 0, mb: 1, fontSize: { xs: '0.85rem', sm: '1rem' }, fontWeight: 800 }}>
                  상세 조건
                </Typography>
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
            </Stack>
          </Paper>
        </Box>

        <Box sx={{ flex: '1 1 auto', minWidth: 0, width: { xs: '100%', md: 'auto' } }}>
          <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="몬스터 검색"
              value={soloSearch}
              onChange={(e) => setSoloSearch(e.target.value)}
              autoComplete="off"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1.5 }}
            />
            <ToggleButtonGroup
              exclusive
              value={elementFilter}
              onChange={handleElementFilterChange}
              size="small"
              color="primary"
              fullWidth
              sx={{ flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}
            >
              <ToggleButton value="all" sx={{ textTransform: 'none', fontWeight: 600 }}>
                전체
              </ToggleButton>
              {ELEMENT_TOGGLE_ORDER.map((el) => (
                <ToggleButton key={el} value={el} aria-label={el}>
                  <AttributeElementIcon attribute={el} size={20} />
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <PlayerPicksSortSelect value={monsterStatsSort} onChange={setMonsterStatsSort} />

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
            수집된 RTA 리플레이 기준 시즌 스냅. 배치
            <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}> rta_agg_summoner_monster_snap </Box>
            갱신. 시즌은 상단에서 선택.
          </Typography>

          {sortedStats.length === 0 ? (
            <StatsEmptyState
              title="표시할 통계가 없습니다"
              description="검색·속성에 맞는 몬스터가 없거나, 해당 시즌 스냅이 비어 있을 수 있습니다. 집계 배치가 아직이거나 리플레이가 없을 수 있습니다."
            />
          ) : isNarrow ? (
            <Stack spacing={1.5}>
              {sortedStats.map((row, idx) => (
                <PlayerPickStatCard key={row.unit_master_id} rank={idx + 1} row={row} />
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
                      선픽률
                    </TableCell>
                    <TableCell align="right" sx={TABLE_HEAD_CELL_SX}>
                      보유
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedStats.map((row, idx) => {
                    const rank = idx + 1;
                    return (
                      <TableRow key={row.unit_master_id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell align="center" sx={{ ...NUMERIC_CELL_SX, color: 'text.secondary', fontWeight: 700, fontSize: '0.8rem' }}>
                          {rank}
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
                          {toNum(row.pick_cnt).toLocaleString()}
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
                        <TableCell align="right" sx={NUMERIC_CELL_SX}>
                          {row.owned_copy_count == null ? '—' : row.owned_copy_count}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Stack>
    </Container>
  );
}
