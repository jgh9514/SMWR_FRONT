'use client';

import { useMemo, useState } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import { getRenderableImageUrl } from '@/shared/utils/image';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import AttributeElementIcon from '@/shared/ui/attribute-element-icon/AttributeElementIcon';
import type { AttributeType } from '@/features/siege/types/monster';
import type { DuoComboStat, MonsterStats, TrioComboStat } from '@/features/rta/types/rta';

type SortField =
  | 'pick_count'
  | 'pick_rate'
  | 'win_rate'
  | 'first_pick_rate'
  | 'ban_rate'
  | 'monster_name';
type SortOrder = 'asc' | 'desc';

type ComboSortField = 'match_count' | 'win_rate';

interface RtaMonsterStatsClientProps {
  stats: MonsterStats[];
  duoStats: DuoComboStat[];
  trioStats: TrioComboStat[];
  totalMatches: number;
}

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

export default function RtaMonsterStatsClient({
  stats,
  duoStats: duoStatsRaw,
  trioStats: trioStatsRaw,
  totalMatches,
}: RtaMonsterStatsClientProps) {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));

  const [tab, setTab] = useState(0);
  const [sortField, setSortField] = useState<SortField>('pick_count');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [duoSortField, setDuoSortField] = useState<ComboSortField>('win_rate');
  const [duoSortOrder, setDuoSortOrder] = useState<SortOrder>('desc');
  const [trioSortField, setTrioSortField] = useState<ComboSortField>('win_rate');
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

  const handleComboSort = (
    field: ComboSortField,
    currentField: ComboSortField,
    setField: (f: ComboSortField) => void,
    currentOrder: SortOrder,
    setOrder: (o: SortOrder) => void,
  ) => {
    if (currentField === field) {
      setOrder(currentOrder === 'asc' ? 'desc' : 'asc');
      return;
    }
    setField(field);
    setOrder('desc');
  };

  const formatPercentage = (value: number) => `${toNum(value).toFixed(2)}%`;

  const sortChipSx = (selected: boolean) => ({
    height: 28,
    fontWeight: selected ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: 2,
    },
  });

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

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
      <PageHeader title="RTA 몬스터별 통계" />

      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: { xs: 2, md: 2.5 },
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          background: (t) =>
            t.palette.mode === 'dark'
              ? `linear-gradient(135deg, ${t.palette.primary.dark}22 0%, ${t.palette.background.paper} 60%)`
              : `linear-gradient(135deg, ${t.palette.primary.light}33 0%, ${t.palette.background.paper} 55%)`,
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          집계 기준
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, maxWidth: 720 }}>
          솔로는 몬스터 1마리 기준 픽·승·벤 등입니다. 듀오·트리오는{' '}
          5픽 중 <strong>벤된 슬롯은 제외</strong>하고, 실제 필드에 나온 4마리만으로 조합을 냅니다. 팀당 매치마다
          2마리 쌍은 <strong>6개</strong>(C(4,2)), 3마리 묶음은 <strong>4개</strong>(C(4,3))입니다. 표에는 동일 조합이{' '}
          <strong>2경기 이상</strong>인 경우만 올립니다.
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
          <Chip
            size="small"
            icon={<GroupsIcon sx={{ fontSize: '1rem !important' }} />}
            label={
              totalMatches > 0
                ? `총 ${totalMatches.toLocaleString()}매치 기준`
                : '매치 수 집계 중'
            }
            color="primary"
            variant="outlined"
          />
        </Box>
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              minHeight: 48,
              fontWeight: 600,
              textTransform: 'none',
            },
          }}
        >
          <Tab icon={<PersonIcon />} iconPosition="start" label="솔로 (1마리)" />
          <Tab icon={<Diversity3Icon />} iconPosition="start" label="듀오 (2마리 조합)" />
          <Tab icon={<GroupsIcon />} iconPosition="start" label="트리오 (3마리 조합)" />
        </Tabs>
      </Box>

      {tab === 0 && (
        <>
          <Card sx={{ mb: 2, bgcolor: 'background.paper' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  정렬:
                </Typography>
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
                      sx={sortChipSx(isSelected)}
                    />
                  );
                })}
              </Box>
            </CardContent>
          </Card>

          {sortedStats.length === 0 ? (
            <Card>
              <CardContent>
                <Typography color="text.secondary" align="center">
                  데이터가 없습니다.
                </Typography>
              </CardContent>
            </Card>
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
                            #{index + 1}
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
                            alt={stat.monster_name}
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
                            {stat.monster_name.charAt(0)}
                          </Avatar>
                          <Typography
                            variant="body2"
                            component="div"
                            title={stat.monster_name}
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
                                p: { xs: 1, md: 1.5 },
                                borderRadius: 1.5,
                                bgcolor: 'action.hover',
                                border: '1px solid',
                                borderColor: 'divider',
                                transition: 'all 0.2s',
                                '&:hover': {
                                  bgcolor: 'action.selected',
                                  transform: 'scale(1.02)',
                                },
                              }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  display: 'block',
                                  mb: 1,
                                  fontWeight: 500,
                                  textTransform: 'uppercase',
                                  letterSpacing: 0.5,
                                }}
                              >
                                {item.label}
                              </Typography>
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 700,
                                  color: 'text.primary',
                                  lineHeight: 1.2,
                                  fontSize: { xs: '1rem', md: '1.25rem' },
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
        </>
      )}

      {tab === 1 && (
        <>
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  정렬:
                </Typography>
                {(['match_count', 'win_rate'] as ComboSortField[]).map((field) => {
                  const labels: Record<ComboSortField, string> = {
                    match_count: '표본(경기 수)',
                    win_rate: '승률',
                  };
                  const isSelected = duoSortField === field;
                  return (
                    <Chip
                      key={field}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <span>{labels[field]}</span>
                          {isSelected &&
                            (duoSortOrder === 'asc' ? (
                              <ArrowUpwardIcon sx={{ fontSize: '0.875rem' }} />
                            ) : (
                              <ArrowDownwardIcon sx={{ fontSize: '0.875rem' }} />
                            ))}
                        </Box>
                      }
                      onClick={() =>
                        handleComboSort(
                          field,
                          duoSortField,
                          setDuoSortField,
                          duoSortOrder,
                          setDuoSortOrder,
                        )
                      }
                      color={isSelected ? 'primary' : 'default'}
                      variant={isSelected ? 'filled' : 'outlined'}
                      size="small"
                      sx={sortChipSx(isSelected)}
                    />
                  );
                })}
              </Box>
            </CardContent>
          </Card>

          {sortedDuo.length === 0 ? (
            <Card>
              <CardContent>
                <Typography color="text.secondary" align="center">
                  표시할 듀오 조합이 없습니다. RTA 리플레이가 없거나, 어떤 조합도 2경기 미만으로만
                  등장했을 수 있습니다. 서버 통계는 잠시 캐시될 수 있어 갱신이 늦을 수 있습니다.
                </Typography>
              </CardContent>
            </Card>
          ) : isNarrow ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {sortedDuo.map((row, i) => (
                <Card key={`${row.monster_id_1}-${row.monster_id_2}-${i}`} variant="outlined">
                  <CardContent sx={{ py: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Chip label={`#${i + 1}`} size="small" color="primary" variant="outlined" />
                      <Typography variant="h6" fontWeight={800} color="success.main">
                        {formatPercentage(row.win_rate)}
                      </Typography>
                    </Box>
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
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                      표본 {row.match_count.toLocaleString()}경기
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', width: '100%' }}>
                <TableHead>
                  <TableRow>
                    <TableCell width="4%">#</TableCell>
                    <TableCell width="56%">조합</TableCell>
                    <TableCell align="right" width="22%">
                      표본
                    </TableCell>
                    <TableCell align="right" width="18%">
                      승률
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedDuo.map((row, i) => (
                    <TableRow key={`${row.monster_id_1}-${row.monster_id_2}-${i}`} hover>
                      <TableCell>{i + 1}</TableCell>
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
                      <TableCell align="right">{row.match_count.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={700} color="success.main">
                          {formatPercentage(row.win_rate)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {tab === 2 && (
        <>
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  정렬:
                </Typography>
                {(['match_count', 'win_rate'] as ComboSortField[]).map((field) => {
                  const labels: Record<ComboSortField, string> = {
                    match_count: '표본(경기 수)',
                    win_rate: '승률',
                  };
                  const isSelected = trioSortField === field;
                  return (
                    <Chip
                      key={field}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <span>{labels[field]}</span>
                          {isSelected &&
                            (trioSortOrder === 'asc' ? (
                              <ArrowUpwardIcon sx={{ fontSize: '0.875rem' }} />
                            ) : (
                              <ArrowDownwardIcon sx={{ fontSize: '0.875rem' }} />
                            ))}
                        </Box>
                      }
                      onClick={() =>
                        handleComboSort(
                          field,
                          trioSortField,
                          setTrioSortField,
                          trioSortOrder,
                          setTrioSortOrder,
                        )
                      }
                      color={isSelected ? 'primary' : 'default'}
                      variant={isSelected ? 'filled' : 'outlined'}
                      size="small"
                      sx={sortChipSx(isSelected)}
                    />
                  );
                })}
              </Box>
            </CardContent>
          </Card>

          {sortedTrio.length === 0 ? (
            <Card>
              <CardContent>
                <Typography color="text.secondary" align="center">
                  표시할 트리오 조합이 없습니다. RTA 리플레이가 없거나, 어떤 조합도 2경기 미만으로만
                  등장했을 수 있습니다. 서버 통계는 잠시 캐시될 수 있어 갱신이 늦을 수 있습니다.
                </Typography>
              </CardContent>
            </Card>
          ) : isNarrow ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {sortedTrio.map((row, i) => (
                <Card key={`${row.monster_id_1}-${row.monster_id_2}-${row.monster_id_3}-${i}`} variant="outlined">
                  <CardContent sx={{ py: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Chip label={`#${i + 1}`} size="small" color="primary" variant="outlined" />
                      <Typography variant="h6" fontWeight={800} color="success.main">
                        {formatPercentage(row.win_rate)}
                      </Typography>
                    </Box>
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
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                      표본 {row.match_count.toLocaleString()}경기
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
              <Table size="small" stickyHeader sx={{ minWidth: 640, tableLayout: 'fixed', width: '100%' }}>
                <TableHead>
                  <TableRow>
                    <TableCell width="4%">#</TableCell>
                    <TableCell width="54%">조합</TableCell>
                    <TableCell align="right" width="22%">
                      표본
                    </TableCell>
                    <TableCell align="right" width="20%">
                      승률
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedTrio.map((row, i) => (
                    <TableRow key={`${row.monster_id_1}-${row.monster_id_2}-${row.monster_id_3}-${i}`} hover>
                      <TableCell>{i + 1}</TableCell>
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
                      <TableCell align="right">{row.match_count.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={700} color="success.main">
                          {formatPercentage(row.win_rate)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Container>
  );
}
