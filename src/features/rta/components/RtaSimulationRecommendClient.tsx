'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { MonsterOption } from '@/features/siege/hooks/useSiegeList';
import { normalizeMonsterList } from '@/features/siege/lib/normalizeMonsterOption';
import { useApiPostQuery } from '@/hooks/api/useApiQuery';
import { getRenderableImageUrl } from '@/shared/utils/image';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import {
  buildMonsterStatsTierBody,
  useRtaMonsterStats,
  useRtaRatingGradeRules,
  useRtaSeasonSelect,
} from '@/features/rta/hooks/useRtaData';
import { useRtaSeasonsContext } from '@/features/rta/context/RtaSeasonsContext';
import RtaSeasonTierSelectRow from '@/features/rta/components/RtaSeasonTierSelectRow';
import RtaUnitPickGrid from '@/features/rta/components/RtaUnitPickGrid';
import type { CounterMatchupRow, DuoComboStat, MonsterStats, TrioComboStat } from '@/features/rta/types/rta';
import { apiClient } from '@/shared/lib/api/client';

type DraftSide = 'FIRST' | 'SECOND';

type RecommendationRow = {
  monsterId: string;
  monsterName: string;
  monsterImage?: string;
  score: number;
  baseWinRate: number;
  opponentWinRate: number | null;
  opponentEvidenceMatches: number;
  synergyBonus: number;
  counterBonus: number;
};

const PICK_ORDER_IF_FIRST: Array<'ME' | 'ENEMY'> = [
  'ME', 'ENEMY', 'ENEMY', 'ME', 'ME', 'ENEMY', 'ENEMY', 'ME', 'ME', 'ENEMY',
];

const PICK_ORDER_IF_SECOND: Array<'ME' | 'ENEMY'> = [
  'ENEMY', 'ME', 'ME', 'ENEMY', 'ENEMY', 'ME', 'ME', 'ENEMY', 'ENEMY', 'ME',
];

const DRAFT_TURN_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function duoKey(a: string, b: string): string {
  return [a, b].sort().join(':');
}

function trioKey(a: string, b: string, c: string): string {
  return [a, b, c].sort().join(':');
}

function normalizeCounterComboKey(v: string): string {
  return v
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .sort()
    .join(',');
}

function buildEnemyComboKeySet(enemyPickIds: string[], size: 1 | 2 | 3): Set<string> {
  const out = new Set<string>();
  if (size === 1) {
    for (const id of enemyPickIds) out.add(id);
    return out;
  }
  if (size === 2) {
    for (let i = 0; i < enemyPickIds.length; i += 1) {
      for (let j = i + 1; j < enemyPickIds.length; j += 1) {
        out.add(normalizeCounterComboKey(`${enemyPickIds[i]},${enemyPickIds[j]}`));
      }
    }
    return out;
  }
  for (let i = 0; i < enemyPickIds.length; i += 1) {
    for (let j = i + 1; j < enemyPickIds.length; j += 1) {
      for (let k = j + 1; k < enemyPickIds.length; k += 1) {
        out.add(normalizeCounterComboKey(`${enemyPickIds[i]},${enemyPickIds[j]},${enemyPickIds[k]}`));
      }
    }
  }
  return out;
}

function sanitizePickList(list: MonsterOption[], max = 5): MonsterOption[] {
  const used = new Set<string>();
  const next: MonsterOption[] = [];
  for (const item of list) {
    const id = String(item.monster_id ?? '').trim();
    if (!id || used.has(id)) continue;
    used.add(id);
    next.push(item);
    if (next.length >= max) break;
  }
  return next;
}

function toGridUnits(list: MonsterOption[]) {
  return list.map((m, idx) => ({
    image: m.image_url,
    name: m.modified_kr_name?.trim() || m.kr_name?.trim() || `#${m.monster_id}`,
    monsterId: String(m.monster_id),
    pickSlotNo: idx + 1,
  }));
}

export default function RtaSimulationRecommendClient() {
  const [myDraftSide, setMyDraftSide] = useState<DraftSide>('FIRST');
  const [myPicks, setMyPicks] = useState<MonsterOption[]>([]);
  const [enemyPicks, setEnemyPicks] = useState<MonsterOption[]>([]);
  const [tierSelection, setTierSelection] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: seasonsData } = useRtaSeasonsContext();
  const { seasonSelectValue, seasonIdForApi, setSeason, seasonOptions } = useRtaSeasonSelect(seasonsData);
  const { data: gradeRules = [], isLoading: tierRulesLoading } = useRtaRatingGradeRules();

  const tierBody = useMemo(
    () => buildMonsterStatsTierBody(tierSelection, gradeRules),
    [tierSelection, gradeRules],
  );

  const ratingIdForCounter = useMemo(() => {
    if ('ratingId' in tierBody && tierBody.ratingId != null && tierBody.ratingId > 0) {
      return tierBody.ratingId;
    }
    if ('ratingIds' in tierBody && Array.isArray(tierBody.ratingIds) && tierBody.ratingIds.length > 0) {
      return tierBody.ratingIds[0];
    }
    return null;
  }, [tierBody]);

  const { data: monsterCatalog = [], isLoading: catalogLoading } = useApiPostQuery<MonsterOption[]>(
    '/summonerswar/monster-list',
    {},
    {
      enabled: true,
      select: (raw) => normalizeMonsterList(raw, { awakenedOnly: true }),
      staleTime: 60 * 60 * 1000,
      gcTime: 2 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  );

  const { data: soloData, isLoading: soloLoading } = useRtaMonsterStats({
    type: 'solo',
    limit: 220,
    offset: 0,
    seasonCode: seasonSelectValue,
    seasonId: seasonIdForApi,
    sortField: 'win_rate',
    sortOrder: 'desc',
    ...(tierBody.ratingId ? { ratingId: tierBody.ratingId } : {}),
    ...(tierBody.ratingIds ? { ratingIds: tierBody.ratingIds } : {}),
  });

  const { data: duoData, isLoading: duoLoading } = useRtaMonsterStats({
    type: 'duo',
    limit: 320,
    offset: 0,
    seasonCode: seasonSelectValue,
    seasonId: seasonIdForApi,
    sortField: 'win_rate',
    sortOrder: 'desc',
    ...(tierBody.ratingId ? { ratingId: tierBody.ratingId } : {}),
    ...(tierBody.ratingIds ? { ratingIds: tierBody.ratingIds } : {}),
  });

  const { data: trioData, isLoading: trioLoading } = useRtaMonsterStats({
    type: 'trio',
    limit: 320,
    offset: 0,
    seasonCode: seasonSelectValue,
    seasonId: seasonIdForApi,
    sortField: 'win_rate',
    sortOrder: 'desc',
    ...(tierBody.ratingId ? { ratingId: tierBody.ratingId } : {}),
    ...(tierBody.ratingIds ? { ratingIds: tierBody.ratingIds } : {}),
  });

  const monsterById = useMemo(() => {
    const map = new Map<string, MonsterOption>();
    for (const m of monsterCatalog) {
      const id = String(m.monster_id ?? '').trim();
      if (id) map.set(id, m);
    }
    return map;
  }, [monsterCatalog]);

  const usedIds = useMemo(() => {
    const set = new Set<string>();
    for (const p of myPicks) set.add(String(p.monster_id));
    for (const p of enemyPicks) set.add(String(p.monster_id));
    return set;
  }, [myPicks, enemyPicks]);

  const nextTurnOwner = useMemo(() => {
    const order = myDraftSide === 'FIRST' ? PICK_ORDER_IF_FIRST : PICK_ORDER_IF_SECOND;
    const currentTurn = myPicks.length + enemyPicks.length;
    if (currentTurn >= 10) return 'DONE';
    return order[currentTurn];
  }, [myDraftSide, myPicks.length, enemyPicks.length]);

  const myGridUnits = useMemo(() => toGridUnits(myPicks), [myPicks]);
  const enemyGridUnits = useMemo(() => toGridUnits(enemyPicks), [enemyPicks]);
  const myIsFirstPick = myDraftSide === 'FIRST';
  const enemyIsFirstPick = !myIsFirstPick;
  const turnOrder = myDraftSide === 'FIRST' ? PICK_ORDER_IF_FIRST : PICK_ORDER_IF_SECOND;

  const handleMyPicksChange = useCallback(
    (_: unknown, value: MonsterOption[]) => {
      const next = sanitizePickList(value).filter((m) => !enemyPicks.some((e) => e.monster_id === m.monster_id));
      setMyPicks(next);
    },
    [enemyPicks],
  );

  const handleEnemyPicksChange = useCallback(
    (_: unknown, value: MonsterOption[]) => {
      const next = sanitizePickList(value).filter((m) => !myPicks.some((e) => e.monster_id === m.monster_id));
      setEnemyPicks(next);
    },
    [myPicks],
  );

  const calculateRecommendations = useCallback(async () => {
    setErrorMessage(null);
    setRecommendations([]);

    const soloRows = (soloData?.rows ?? []) as MonsterStats[];
    if (!soloRows.length) {
      setErrorMessage('추천 계산에 필요한 통계 데이터가 아직 없습니다.');
      return;
    }

    const duoRows = (duoData?.rows ?? []) as DuoComboStat[];
    const trioRows = (trioData?.rows ?? []) as TrioComboStat[];
    const myPickIds = myPicks.map((p) => String(p.monster_id));
    const enemyPickIds = enemyPicks.map((p) => String(p.monster_id));

    const duoWinRateByPair = new Map<string, number>();
    for (const row of duoRows) {
      const a = String(row.monster_id_1 ?? '').trim();
      const b = String(row.monster_id_2 ?? '').trim();
      if (!a || !b) continue;
      duoWinRateByPair.set(duoKey(a, b), toNum(row.win_rate));
    }

    const trioWinRateBySet = new Map<string, number>();
    for (const row of trioRows) {
      const a = String(row.monster_id_1 ?? '').trim();
      const b = String(row.monster_id_2 ?? '').trim();
      const c = String(row.monster_id_3 ?? '').trim();
      if (!a || !b || !c) continue;
      trioWinRateBySet.set(trioKey(a, b, c), toNum(row.win_rate));
    }

    const baseCandidates: RecommendationRow[] = [];
    for (const row of soloRows) {
      const candidateId = String(row.monster_id ?? '').trim();
      if (!candidateId || usedIds.has(candidateId)) continue;

      const baseWinRate = toNum(row.win_rate);
      const pickRate = toNum(row.pick_rate);
      const pickCount = toNum(row.pick_count);

      let synergyBonus = 0;
      for (const myId of myPickIds) {
        const wr = duoWinRateByPair.get(duoKey(candidateId, myId));
        if (wr != null) synergyBonus += (wr - 50) * 1.2;
      }

      if (myPickIds.length >= 2) {
        for (let i = 0; i < myPickIds.length; i += 1) {
          for (let j = i + 1; j < myPickIds.length; j += 1) {
            const wr = trioWinRateBySet.get(trioKey(candidateId, myPickIds[i], myPickIds[j]));
            if (wr != null) synergyBonus += (wr - 50) * 1.5;
          }
        }
      }

      const baseScore =
        (baseWinRate - 45) * 2.4 +
        pickRate * 0.16 +
        Math.min(Math.log10(Math.max(1, pickCount)), 5) * 2.2 +
        synergyBonus;

      baseCandidates.push({
        monsterId: candidateId,
        monsterName: row.monster_name ?? `#${candidateId}`,
        monsterImage: row.monster_image,
        score: baseScore,
        baseWinRate,
        opponentWinRate: null,
        opponentEvidenceMatches: 0,
        synergyBonus,
        counterBonus: 0,
      });
    }

    const shortList = [...baseCandidates].sort((a, b) => b.score - a.score).slice(0, 24);
    if (!enemyPickIds.length || ratingIdForCounter == null || ratingIdForCounter <= 0) {
      setRecommendations(shortList.slice(0, 10));
      return;
    }

    const enemyComboSizes = [1, 2, 3].filter((size) => enemyPickIds.length >= size) as Array<1 | 2 | 3>;
    const enemyComboKeyMap = new Map<1 | 2 | 3, Set<string>>();
    for (const size of enemyComboSizes) {
      enemyComboKeyMap.set(size, buildEnemyComboKeySet(enemyPickIds, size));
    }

    setCalculating(true);
    try {
      const withCounter = await Promise.all(
        shortList.map(async (candidate) => {
          const counterResponses = await Promise.all(
            enemyComboSizes.map(async (size) =>
              apiClient.post<{ rows?: CounterMatchupRow[] }>('/rta/monster-counter', {
                monster_id: Number(candidate.monsterId),
                combo_size: size,
                ratingId: ratingIdForCounter,
                ...(seasonIdForApi != null ? { seasonId: seasonIdForApi } : {}),
              }),
            ),
          );

          let weightedWinRateSum = 0;
          let weightedCountSum = 0;
          let evidenceMatches = 0;

          for (let i = 0; i < counterResponses.length; i += 1) {
            const comboSize = enemyComboSizes[i]!;
            const expectedKeySet = enemyComboKeyMap.get(comboSize);
            if (!expectedKeySet || expectedKeySet.size === 0) continue;
            const rows = Array.isArray(counterResponses[i]?.rows) ? counterResponses[i]!.rows! : [];
            const comboWeight = comboSize === 3 ? 2.2 : comboSize === 2 ? 1.6 : 1.0;

            for (const row of rows) {
              const rawKey = String(row.opponentComboKey ?? '').trim();
              if (!rawKey) continue;
              const normalizedKey = normalizeCounterComboKey(rawKey);
              if (!expectedKeySet.has(normalizedKey)) continue;

              const winRate = toNum(row.winRate, NaN);
              if (!Number.isFinite(winRate)) continue;
              const matchCnt = Math.max(1, toNum(row.matchCnt, 0));
              const weight = matchCnt * comboWeight;
              weightedWinRateSum += winRate * weight;
              weightedCountSum += weight;
              evidenceMatches += matchCnt;
            }
          }

          const opponentWinRate = weightedCountSum > 0 ? weightedWinRateSum / weightedCountSum : null;
          const counterBonus = opponentWinRate != null ? (opponentWinRate - 50) * 2.4 : 0;

          return {
            ...candidate,
            opponentWinRate,
            opponentEvidenceMatches: evidenceMatches,
            counterBonus,
            score: candidate.score + counterBonus,
          };
        }),
      );

      setRecommendations(withCounter.sort((a, b) => b.score - a.score).slice(0, 10));
    } catch {
      setRecommendations(shortList.slice(0, 10));
      setErrorMessage('일부 카운터 계산에 실패해 시너지 기반 추천만 표시합니다.');
    } finally {
      setCalculating(false);
    }
  }, [
    duoData?.rows,
    enemyPicks,
    myPicks,
    ratingIdForCounter,
    seasonIdForApi,
    soloData?.rows,
    trioData?.rows,
    usedIds,
  ]);

  const allLoading = catalogLoading || soloLoading || duoLoading || trioLoading;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <PageHeader title="RTA 시뮬레이션 추천" />

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
            RTA 드래프트 조사 요약
          </Typography>
          <Stack spacing={0.75}>
            <Typography variant="body2" color="text.secondary">
              - 픽 순서: 1(선) → 2,3(후) → 4,5(선) → 6,7(후) → 8,9(선) → 10(후)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              - 각자 5픽 완료 후 상대 몬스터 1밴, 이후 리더 스킬 선택
            </Typography>
            <Typography variant="body2" color="text.secondary">
              - 중복 픽 불가(양 팀 동일 몬스터 동시 사용 불가)
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            선/후픽과 현재 픽 상황을 넣으면, 시즌/티어 통계 기반으로 다음 추천 픽을 계산합니다.
          </Typography>

          <RtaSeasonTierSelectRow
            seasonSelectValue={seasonSelectValue}
            setSeason={setSeason}
            seasonOptions={seasonOptions}
            tierSelection={tierSelection}
            setTierSelection={setTierSelection}
            gradeRules={gradeRules}
            tierRulesLoading={tierRulesLoading}
            seasonLabelId="rta-sim-season-label"
            mb={2}
          />

          <Stack spacing={2}>
            <FormControl size="small" sx={{ maxWidth: 220 }}>
              <InputLabel id="rta-sim-side-label">내 포지션</InputLabel>
              <Select
                labelId="rta-sim-side-label"
                label="내 포지션"
                value={myDraftSide}
                onChange={(e) => setMyDraftSide(e.target.value as DraftSide)}
              >
                <MenuItem value="FIRST">내가 선픽</MenuItem>
                <MenuItem value="SECOND">내가 후픽</MenuItem>
              </Select>
            </FormControl>

            <Autocomplete
              multiple
              options={monsterCatalog}
              value={myPicks}
              onChange={handleMyPicksChange}
              loading={catalogLoading}
              getOptionLabel={(o) => o.modified_kr_name?.trim() || o.kr_name?.trim() || `#${o.monster_id}`}
              isOptionEqualToValue={(a, b) => a.monster_id === b.monster_id}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.monster_id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar
                    src={getRenderableImageUrl(option.image_url)}
                    alt={option.kr_name}
                    variant="rounded"
                    sx={{ width: 28, height: 28 }}
                  />
                  <Typography variant="body2">
                    {option.modified_kr_name?.trim() || option.kr_name?.trim() || `#${option.monster_id}`}
                  </Typography>
                </Box>
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option.monster_id}
                    avatar={<Avatar src={getRenderableImageUrl(option.image_url)} />}
                    label={option.modified_kr_name?.trim() || option.kr_name?.trim() || `#${option.monster_id}`}
                    size="small"
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="내 픽 (최대 5)"
                  placeholder="몬스터 선택"
                  helperText="상대 픽과 중복은 자동 제외됩니다."
                />
              )}
            />

            <Autocomplete
              multiple
              options={monsterCatalog}
              value={enemyPicks}
              onChange={handleEnemyPicksChange}
              loading={catalogLoading}
              getOptionLabel={(o) => o.modified_kr_name?.trim() || o.kr_name?.trim() || `#${o.monster_id}`}
              isOptionEqualToValue={(a, b) => a.monster_id === b.monster_id}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.monster_id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar
                    src={getRenderableImageUrl(option.image_url)}
                    alt={option.kr_name}
                    variant="rounded"
                    sx={{ width: 28, height: 28 }}
                  />
                  <Typography variant="body2">
                    {option.modified_kr_name?.trim() || option.kr_name?.trim() || `#${option.monster_id}`}
                  </Typography>
                </Box>
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option.monster_id}
                    avatar={<Avatar src={getRenderableImageUrl(option.image_url)} />}
                    label={option.modified_kr_name?.trim() || option.kr_name?.trim() || `#${option.monster_id}`}
                    size="small"
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="상대 픽 (최대 5)"
                  placeholder="몬스터 선택"
                />
              )}
            />

            <Alert severity={nextTurnOwner === 'ME' ? 'success' : 'info'}>
              {nextTurnOwner === 'DONE'
                ? '드래프트 10픽이 모두 입력되었습니다.'
                : nextTurnOwner === 'ME'
                  ? '현재 기준 다음 턴은 내 픽입니다.'
                  : '현재 기준 다음 턴은 상대 픽입니다. 이후 턴 대비 추천으로 참고하세요.'}
            </Alert>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                턴 진행 보드
              </Typography>
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                {DRAFT_TURN_LABELS.map((turn, idx) => {
                  const owner = turnOrder[idx];
                  const selectedCount = myPicks.length + enemyPicks.length;
                  const done = idx < selectedCount;
                  return (
                    <Chip
                      key={turn}
                      size="small"
                      label={`${turn} ${owner === 'ME' ? '나' : '상대'}`}
                      color={done ? 'primary' : 'default'}
                      variant={done ? 'filled' : 'outlined'}
                    />
                  );
                })}
              </Stack>
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={calculateRecommendations}
                disabled={allLoading || calculating}
                startIcon={calculating ? <CircularProgress color="inherit" size={16} /> : undefined}
              >
                추천 계산
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 0.75 }}>
            RTA 스타일 드래프트 보드 (모양 우선)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            실제 RTA 카드처럼 좌/우 진영, VS 중심축, 픽 슬롯 형태를 먼저 고정했습니다.
          </Typography>
          <Box
            sx={(theme) => ({
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              px: { xs: 1, md: 2 },
              py: { xs: 1.25, md: 1.5 },
              bgcolor: theme.palette.mode === 'dark'
                ? alpha(theme.palette.background.default, 0.65)
                : alpha(theme.palette.grey[100], 0.7),
            })}
          >
            <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', gap: 1 }}>
              <Box
                sx={(theme) => ({
                  minWidth: 0,
                  borderRadius: 1.5,
                  px: 1,
                  py: 0.75,
                  background: `linear-gradient(165deg, ${alpha(theme.palette.success.main, 0.22)} 0%, ${alpha(theme.palette.success.main, 0.08)} 100%)`,
                })}
              >
                <Typography variant="caption" sx={{ pl: 0.75, fontWeight: 800 }}>
                  나 {myIsFirstPick ? '(선픽)' : '(후픽)'}
                </Typography>
                <RtaUnitPickGrid
                  units={myGridUnits}
                  isFirstPickInDraft={myIsFirstPick}
                  rowAlign="start"
                />
                <Stack direction="row" spacing={0.5} sx={{ pl: 0.75, pb: 0.5 }}>
                  <Chip size="small" variant="outlined" label="BAN 자리" />
                  <Chip size="small" variant="outlined" label="LEADER 자리" />
                </Stack>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', px: { xs: 0.25, md: 0.75 } }}>
                <Typography variant="overline" sx={{ fontWeight: 900, letterSpacing: '0.22em', color: 'primary.main' }}>
                  VS
                </Typography>
              </Box>

              <Box
                sx={(theme) => ({
                  minWidth: 0,
                  borderRadius: 1.5,
                  px: 1,
                  py: 0.75,
                  background: `linear-gradient(165deg, ${alpha(theme.palette.error.main, 0.2)} 0%, ${alpha(theme.palette.error.main, 0.06)} 100%)`,
                })}
              >
                <Typography
                  variant="caption"
                  sx={{ pr: 0.75, display: 'block', textAlign: 'right', fontWeight: 800 }}
                >
                  상대 {enemyIsFirstPick ? '(선픽)' : '(후픽)'}
                </Typography>
                <RtaUnitPickGrid
                  units={enemyGridUnits}
                  isFirstPickInDraft={enemyIsFirstPick}
                  rowAlign="end"
                />
                <Stack direction="row" spacing={0.5} sx={{ pr: 0.75, pb: 0.5, justifyContent: 'flex-end' }}>
                  <Chip size="small" variant="outlined" label="BAN 자리" />
                  <Chip size="small" variant="outlined" label="LEADER 자리" />
                </Stack>
              </Box>
            </Box>
            <Divider sx={{ my: 1.25 }} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
              레이아웃 고정 규칙: 선픽 팀 1-2-2 / 후픽 팀 2-2-1 (RTA 스네이크 픽)
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {errorMessage && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            추천 결과 TOP 10
          </Typography>

          {recommendations.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              아직 계산된 추천이 없습니다. 위에서 픽을 입력하고 추천 계산을 실행해 주세요.
            </Typography>
          ) : (
            <Stack spacing={1.25}>
              {recommendations.map((row, index) => {
                const info = monsterById.get(row.monsterId);
                const displayName =
                  info?.modified_kr_name?.trim() ||
                  info?.kr_name?.trim() ||
                  row.monsterName ||
                  `#${row.monsterId}`;
                const imageUrl = getRenderableImageUrl(info?.image_url || row.monsterImage);
                return (
                  <Box
                    key={row.monsterId}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: 'auto 1fr auto' },
                      gap: 1.5,
                      alignItems: 'center',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1.5,
                      px: 1.5,
                      py: 1.25,
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 26, fontWeight: 700 }}>
                        #{index + 1}
                      </Typography>
                      <Avatar src={imageUrl} variant="rounded" sx={{ width: 34, height: 34 }} />
                    </Stack>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>
                        {displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        상대 조합 승률 {row.opponentWinRate != null ? `${row.opponentWinRate.toFixed(2)}%` : '데이터 부족'} / 근거 경기 {row.opponentEvidenceMatches.toLocaleString()} / 시너지 {row.synergyBonus >= 0 ? '+' : ''}{row.synergyBonus.toFixed(2)}
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 800, justifySelf: { xs: 'start', md: 'end' } }}>
                      점수 {row.score.toFixed(2)}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
