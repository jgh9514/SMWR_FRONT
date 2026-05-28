'use client';

import { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Container,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import { getRenderableImageUrl } from '@/shared/utils/image';
import type { CounterMatchupRow, MonsterDetail } from '@/features/rta/types/rta';
import { counterMatchupMatchCnt, sortCounterMatchupsByMatchCntDesc } from '@/features/rta/utils/counterMatchupSort';

interface RtaMonsterDetailContentProps {
  data: MonsterDetail;
  embedded?: boolean;
  /** tables: 시너지·카운터 2단 탭 / counter-only: 카운터 솔·듀·트만 (몬스터 상세 상성) */
  embeddedPart?: 'full' | 'tables' | 'counter-only';
}

function counterComboSize(row: CounterMatchupRow): number {
  const n = Number(row.opponentComboSize);
  return Number.isFinite(n) ? n : 0;
}

function MonsterAvatar({ image, name, size = 32 }: { image?: string; name: string; size?: number }) {
  return (
    <Avatar
      src={getRenderableImageUrl(image)}
      alt={name}
      sx={{ width: size, height: size }}
      variant="rounded"
    >
      {name.charAt(0)}
    </Avatar>
  );
}

function WinRateText({ value }: { value: number | null | undefined }) {
  const v = value != null && Number.isFinite(Number(value)) ? Number(value) : null;
  if (v == null) return <Typography variant="body2" color="text.secondary">—</Typography>;
  return (
    <Typography variant="body2" fontWeight={600} color={v >= 50 ? 'success.main' : 'error.main'}>
      {v.toFixed(2)}%
    </Typography>
  );
}

function SynergyDuoTab({ data }: { data: MonsterDetail }) {
  const combos = data.good_combos ?? [];
  if (!combos.length) return <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>데이터가 없습니다.</Typography>;
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>조합</TableCell>
            <TableCell align="right">승률</TableCell>
            <TableCell align="right">경기 수</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {combos.slice(0, 20).map((c, i) => (
            <TableRow key={`${c.monster_id}-${i}`}>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <MonsterAvatar image={data.monster_image} name={data.monster_name} />
                  <Typography variant="body2" color="text.secondary" sx={{ mx: 0.25 }}>+</Typography>
                  <MonsterAvatar image={c.monster_image} name={c.monster_name} />
                  <Typography variant="body2" sx={{ ml: 0.75 }}>{c.monster_name}</Typography>
                </Box>
              </TableCell>
              <TableCell align="right"><WinRateText value={c.win_rate} /></TableCell>
              <TableCell align="right">
                <Typography variant="body2" color="text.secondary">{c.match_count?.toLocaleString()}</Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function SynergyTrioTab({ data }: { data: MonsterDetail }) {
  const combos = data.good_triple_combos ?? [];
  if (!combos.length) return <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>데이터가 없습니다.</Typography>;
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>조합</TableCell>
            <TableCell align="right">승률</TableCell>
            <TableCell align="right">경기 수</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {combos.slice(0, 20).map((c, i) => (
            <TableRow key={`${c.monster1_id}-${c.monster2_id}-${i}`}>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <MonsterAvatar image={data.monster_image} name={data.monster_name} />
                  <Typography variant="body2" color="text.secondary" sx={{ mx: 0.25 }}>+</Typography>
                  <MonsterAvatar image={c.monster1_image} name={c.monster1_name} />
                  <Typography variant="body2" color="text.secondary" sx={{ mx: 0.25 }}>+</Typography>
                  <MonsterAvatar image={c.monster2_image} name={c.monster2_name} />
                  <Typography variant="body2" sx={{ ml: 0.75 }}>{c.monster1_name} · {c.monster2_name}</Typography>
                </Box>
              </TableCell>
              <TableCell align="right"><WinRateText value={c.win_rate} /></TableCell>
              <TableCell align="right">
                <Typography variant="body2" color="text.secondary">{c.match_count?.toLocaleString()}</Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function CounterTab({ rows, size }: { rows: CounterMatchupRow[]; size: 1 | 2 | 3 }) {
  const sorted = useMemo(
    () => sortCounterMatchupsByMatchCntDesc(rows.filter((r) => counterComboSize(r) === size)),
    [rows, size],
  );
  if (!sorted.length) return <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>데이터가 없습니다.</Typography>;
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>상대 조합</TableCell>
            <TableCell align="right">경기수</TableCell>
            <TableCell align="right">승률</TableCell>
            <TableCell align="right">승 / 패</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.slice(0, 30).map((r, i) => {
            const wr = r.winRate != null && Number.isFinite(Number(r.winRate)) ? Number(r.winRate) : null;
            const matchCnt = counterMatchupMatchCnt(r);
            const monsters = r.opponentMonsters ?? [];
            return (
              <TableRow key={`${r.opponentComboKey}-${i}`}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                    {monsters.length > 0 ? monsters.map((m, mi) => (
                      <Box key={m.monsterId} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {mi > 0 && <Typography variant="body2" color="text.secondary">+</Typography>}
                        <MonsterAvatar image={m.monsterImage ?? undefined} name={m.monsterName} />
                        <Typography variant="body2">{m.monsterName}</Typography>
                      </Box>
                    )) : (
                      <Typography variant="body2">{r.opponentLabel ?? r.opponentComboKey ?? '—'}</Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">
                    {matchCnt > 0 ? matchCnt.toLocaleString() : '—'}
                  </Typography>
                </TableCell>
                <TableCell align="right"><WinRateText value={wr} /></TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">
                    {r.winCnt ?? 0} / {r.loseCnt ?? 0}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function CounterTabsPanel({ counterRows }: { counterRows: CounterMatchupRow[] }) {
  const [counterTab, setCounterTab] = useState(0);
  return (
    <Box>
      <Tabs value={counterTab} onChange={(_, v) => setCounterTab(v)} sx={{ mb: 1.5 }} variant="scrollable" scrollButtons="auto">
        <Tab label="솔로" />
        <Tab label="듀오" />
        <Tab label="트리오" />
      </Tabs>
      {counterTab === 0 && <CounterTab rows={counterRows} size={1} />}
      {counterTab === 1 && <CounterTab rows={counterRows} size={2} />}
      {counterTab === 2 && <CounterTab rows={counterRows} size={3} />}
    </Box>
  );
}

function TablesSection({ data, counterOnly = false }: { data: MonsterDetail; counterOnly?: boolean }) {
  const [mainTab, setMainTab] = useState(0);
  const [synergyTab, setSynergyTab] = useState(0);
  const counterRows: CounterMatchupRow[] = data.counter_matchups ?? [];

  if (counterOnly) {
    return <CounterTabsPanel counterRows={counterRows} />;
  }

  return (
    <Box>
      <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="시너지" />
        <Tab label="카운터" />
      </Tabs>

      {mainTab === 0 && (
        <Box>
          <Tabs value={synergyTab} onChange={(_, v) => setSynergyTab(v)} sx={{ mb: 1.5 }} variant="scrollable" scrollButtons="auto">
            <Tab label="듀오" />
            <Tab label="트리오" />
          </Tabs>
          {synergyTab === 0 && <SynergyDuoTab data={data} />}
          {synergyTab === 1 && <SynergyTrioTab data={data} />}
        </Box>
      )}

      {mainTab === 1 && <CounterTabsPanel counterRows={counterRows} />}
    </Box>
  );
}

export default function RtaMonsterDetailContent({
  data,
  embedded = false,
  embeddedPart = 'full',
}: RtaMonsterDetailContentProps) {
  const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

  const statsGrid = (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
      <Box>
        <Typography variant="caption" color="text.secondary">픽횟수</Typography>
        <Typography variant="h6" fontWeight={600}>{data.pick_count.toLocaleString()}</Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">픽률</Typography>
        <Typography variant="h6" fontWeight={600}>{formatPercentage(data.pick_rate)}</Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">승률</Typography>
        {data.win_rate != null && Number.isFinite(Number(data.win_rate)) ? (
          <Typography variant="h6" fontWeight={600} color={Number(data.win_rate) >= 50 ? 'success.main' : 'error.main'}>
            {formatPercentage(Number(data.win_rate))}
          </Typography>
        ) : (
          <Typography variant="h6" fontWeight={600} color="text.secondary">—</Typography>
        )}
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">벤율</Typography>
        <Typography variant="h6" fontWeight={600}>{formatPercentage(data.ban_rate)}</Typography>
      </Box>
    </Box>
  );

  return (
    <Container
      maxWidth={embedded ? false : 'xl'}
      disableGutters={embedded}
      component={embedded ? 'section' : 'div'}
      sx={embedded ? { py: 0, px: 0 } : { py: 4 }}
    >
      {!embedded && (
        <>
          <PageHeader title={data.monster_name} backPath="/rta/monster-stats/solo" />
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
                <Avatar
                  src={getRenderableImageUrl(data.monster_image)}
                  alt={data.monster_name}
                  sx={{ width: { xs: 100, md: 150 }, height: { xs: 100, md: 150 }, boxShadow: 2, border: '2px solid', borderColor: 'divider' }}
                  variant="rounded"
                >
                  {data.monster_name.charAt(0)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>{data.monster_name}</Typography>
                  {statsGrid}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </>
      )}

      {embedded && embeddedPart === 'full' && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" component="h2" sx={{ mb: 2, fontWeight: 800 }}>RTA 실시간 통계</Typography>
          <Card variant="outlined"><CardContent>{statsGrid}</CardContent></Card>
        </Box>
      )}

      {(embedded && (embeddedPart === 'tables' || embeddedPart === 'counter-only')) ? (
        <TablesSection data={data} counterOnly={embeddedPart === 'counter-only'} />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>강한 상대</Typography>
              {data.strong_against?.length ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>몬스터</TableCell>
                        <TableCell align="right">승률</TableCell>
                        <TableCell align="right">경기 수</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.strong_against.slice(0, 10).map((o, i) => (
                        <TableRow key={`${o.monster_id}-${i}`}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <MonsterAvatar image={o.monster_image} name={o.monster_name} />
                              <Typography variant="body2">{o.monster_name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right"><WinRateText value={o.win_rate} /></TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">{o.match_count}</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">데이터가 없습니다.</Typography>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>좋은 콤비</Typography>
              {data.good_combos?.length ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>몬스터</TableCell>
                        <TableCell align="right">승률</TableCell>
                        <TableCell align="right">경기 수</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.good_combos.slice(0, 10).map((c, i) => (
                        <TableRow key={`${c.monster_id}-${i}`}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <MonsterAvatar image={c.monster_image} name={c.monster_name} />
                              <Typography variant="body2">{c.monster_name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right"><WinRateText value={c.win_rate} /></TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">{c.match_count}</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">데이터가 없습니다.</Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      )}
    </Container>
  );
}
