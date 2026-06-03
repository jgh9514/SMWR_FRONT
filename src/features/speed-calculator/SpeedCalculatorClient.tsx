'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  InputAdornment,
  CircularProgress,
  Tooltip,
  Alert,
  Skeleton,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import SpeedIcon from '@mui/icons-material/Speed';
import BoltIcon from '@mui/icons-material/Bolt';
import Image from 'next/image';
import { PageHeader } from '@/shared/ui';
import { useMonsterList } from '@/features/siege/hooks/useSiegeList';
import type { MonsterOption } from '@/features/siege/hooks/useSiegeList';
import { useMonsterInfo } from '@/features/siege/hooks/useMonsterInfo';
import { getRenderableImageUrl } from '@/shared/utils/image';

// ─── 타입 ──────────────────────────────────────────────────────────────────

type TabKey = 'siege' | 'arena' | 'speed-table';

interface MonsterSlot {
  monster: MonsterOption | null;
  runeSpd: number;        // 룬 고정 속도
  swiftSet: boolean;      // 신속 룬 세트 여부
  leaderSkillPct: number; // 리더스킬 속도 보너스 (%)
  towerBonusPct: number;  // 건물(토템) 보너스 (%)
  atbBoost: number;       // 게이지 증가 스킬 수치 (%, 예: 바나드 30)
  isEnemy: boolean;       // 적 진영 여부 (점령전 컷오프 계산용)
}

const EMPTY_SLOT: MonsterSlot = {
  monster: null, runeSpd: 0, swiftSet: false,
  leaderSkillPct: 0, towerBonusPct: 0, atbBoost: 0, isEnemy: false,
};

const ALLY_SLOT_COUNT = 3;
const ENEMY_SLOT_COUNT = 3;
const TOTAL_SLOT_COUNT = ALLY_SLOT_COUNT + ENEMY_SLOT_COUNT;

const ELEMENT_COLOR: Record<string, string> = {
  Water: '#0055FF', Fire: '#FF4400', Wind: '#22AA44', Light: '#AA8800', Dark: '#9933CC',
};

// ─── 공속 계산 공식 (SW 실제 공식) ──────────────────────────────────────────
// swift_bonus = floor(base * 0.25)
// stat_bonus  = round(base * (leader + tower) / 100)
// final_spd   = base + rune + swift_bonus + stat_bonus

export function calcFinalSpd(
  baseSpd: number,
  runeSpd: number,
  swiftSet: boolean,
  leaderPct: number,
  towerPct: number,
): number {
  const swiftBonus = swiftSet ? Math.floor(baseSpd * 0.25) : 0;
  const statBonus = Math.round(baseSpd * (leaderPct + towerPct) / 100);
  return baseSpd + runeSpd + swiftBonus + statBonus;
}

// ─── 틱 시뮬레이션 ──────────────────────────────────────────────────────────

export interface SimMonster {
  id: number;
  name: string;
  imageUrl?: string;
  finalSpd: number;
  atbBoost: number; // 게이지 증가 스킬 수치 (%)
  isEnemy: boolean;
  teamOrder: number; // 같은 팀 내 배치 순서 (좌→우 0-based, tie-break용)
}

export interface TurnEvent {
  tick: number;
  monsterId: number;
  monsterName: string;
  isEnemy: boolean;
  atbAfterTurn: number; // 초과분 보존 후 ATB
}

const ATB_THRESHOLD = 100;
const ATB_TICK_MULT = 0.07;
const MAX_TICKS = 5000; // 무한루프 방지
const MAX_TURNS = 30;   // 결과에 표시할 최대 턴 수

export function simulateTicks(monsters: SimMonster[]): TurnEvent[] {
  if (monsters.length === 0) return [];

  const atb = new Map<number, number>(monsters.map((m) => [m.id, 0]));
  const events: TurnEvent[] = [];
  let tick = 0;
  let totalTurns = 0;

  while (tick < MAX_TICKS && totalTurns < MAX_TURNS) {
    tick += 1;

    // Step A: 게이지 증가
    for (const m of monsters) {
      atb.set(m.id, (atb.get(m.id) ?? 0) + m.finalSpd * ATB_TICK_MULT);
    }

    // Step B: 100 이상인 몬스터 수집 → ATB 높은 순 → 동점이면 팀 배치 순서
    let ready = monsters.filter((m) => (atb.get(m.id) ?? 0) >= ATB_THRESHOLD);
    if (ready.length === 0) continue;

    ready.sort((a, b) => {
      const diff = (atb.get(b.id) ?? 0) - (atb.get(a.id) ?? 0);
      if (Math.abs(diff) > 1e-9) return diff;
      // 동점: 팀 배치 순서 (팀 내 leftmost 우선)
      return a.teamOrder - b.teamOrder;
    });

    for (const actor of ready) {
      const currentAtb = atb.get(actor.id) ?? 0;
      if (currentAtb < ATB_THRESHOLD) break; // 이전 actor의 boost로 재계산 필요 시 break

      // Step D: 게이지 차감 (초과분 보존)
      const remaining = currentAtb - ATB_THRESHOLD;
      atb.set(actor.id, remaining);

      events.push({
        tick,
        monsterId: actor.id,
        monsterName: actor.name,
        isEnemy: actor.isEnemy,
        atbAfterTurn: remaining,
      });
      totalTurns += 1;

      // Step C: ATB 부스트 스킬 반영 (아군에게만)
      if (actor.atbBoost > 0) {
        for (const ally of monsters) {
          if (!ally.isEnemy && ally.id !== actor.id) {
            atb.set(ally.id, (atb.get(ally.id) ?? 0) + actor.atbBoost);
          }
        }
      }

      if (totalTurns >= MAX_TURNS) break;
    }
  }

  return events;
}

// ─── 몬스터 픽커 다이얼로그 ──────────────────────────────────────────────────

interface MonsterPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (monster: MonsterOption) => void;
  monsterList: MonsterOption[];
  isLoading: boolean;
}

function MonsterPicker({ open, onClose, onSelect, monsterList, isLoading }: MonsterPickerProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 80); }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return monsterList.slice(0, 60);
    return monsterList.filter((m) =>
      m.kr_name.toLowerCase().includes(q) ||
      (m.modified_kr_name ?? '').toLowerCase().includes(q) ||
      m.un_name.toLowerCase().includes(q) ||
      m.monster_id.includes(q),
    ).slice(0, 60);
  }, [query, monsterList]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">몬스터 선택</Typography>
          <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ px: 2, pt: 0.5, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField
            inputRef={inputRef} fullWidth size="small" placeholder="몬스터 이름 검색..."
            value={query} onChange={(e) => setQuery(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
        </Box>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={32} /></Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: 0.75, p: 1.5, maxHeight: 400, overflow: 'auto' }}>
            {filtered.map((m) => (
              <Box
                key={m.monster_id}
                onClick={() => { onSelect(m); onClose(); }}
                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, p: 0.75, borderRadius: 1.5, cursor: 'pointer', border: '1px solid transparent', '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' } }}
              >
                <Box sx={{ width: 44, height: 44, borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider', bgcolor: 'grey.50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Image src={getRenderableImageUrl(m.image_url)} alt={m.kr_name} width={40} height={40} style={{ objectFit: 'contain' }} unoptimized />
                </Box>
                <Typography variant="caption" sx={{ fontSize: '0.62rem', textAlign: 'center', lineHeight: 1.2, wordBreak: 'keep-all' }}>
                  {m.modified_kr_name ?? m.kr_name}
                </Typography>
              </Box>
            ))}
            {filtered.length === 0 && (
              <Box sx={{ gridColumn: '1/-1', textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">검색 결과가 없습니다.</Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── 슬롯 입력 카드 ───────────────────────────────────────────────────────────

interface SlotCardProps {
  slot: MonsterSlot;
  label: string;
  color: 'primary' | 'error' | 'default';
  baseSpeed: number | null;
  isLoadingInfo: boolean;
  finalSpd: number;
  onClickPortrait: () => void;
  onRemove: () => void;
  onChange: (patch: Partial<MonsterSlot>) => void;
}

function SlotCard({ slot, label, color, baseSpeed, isLoadingInfo, finalSpd, onClickPortrait, onRemove, onChange }: SlotCardProps) {
  const hasMonster = !!slot.monster;
  const elementColor = slot.monster?.monster_elemental ? (ELEMENT_COLOR[slot.monster.monster_elemental] ?? '#888') : '#888';

  return (
    <Box sx={{ border: '2px solid', borderColor: color === 'primary' ? 'primary.main' : color === 'error' ? 'error.light' : 'divider', borderRadius: 2, p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25, bgcolor: color === 'primary' ? 'rgba(25,118,210,0.04)' : color === 'error' ? 'rgba(211,47,47,0.03)' : 'background.paper' }}>

      {/* 배지 + 최종공속 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Chip label={label} size="small" color={color} sx={{ fontSize: '0.7rem', height: 20 }} />
        {finalSpd > 0 && (
          <Chip
            icon={<SpeedIcon sx={{ fontSize: '12px !important' }} />}
            label={finalSpd}
            size="small"
            variant="outlined"
            color={color === 'error' ? 'error' : 'primary'}
            sx={{ fontSize: '0.7rem', height: 20, ml: 'auto', fontFamily: 'monospace', fontWeight: 700 }}
          />
        )}
      </Box>

      {/* 초상화 + 이름 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Box
          onClick={onClickPortrait}
          sx={{ width: 48, height: 48, flexShrink: 0, borderRadius: 1.5, border: '2px solid', borderColor: hasMonster ? elementColor : 'divider', bgcolor: 'grey.50', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', '&:hover': { borderColor: 'primary.main', opacity: 0.85 } }}
        >
          {hasMonster ? (
            <Image src={getRenderableImageUrl(slot.monster!.image_url)} alt={slot.monster!.kr_name} width={44} height={44} style={{ objectFit: 'contain' }} unoptimized />
          ) : (
            <Typography sx={{ color: 'text.disabled', fontSize: '0.58rem', textAlign: 'center', lineHeight: 1.3 }}>클릭<br />선택</Typography>
          )}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }} noWrap>
            {slot.monster ? (slot.monster.modified_kr_name ?? slot.monster.kr_name) : '몬스터 없음'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>기본속:</Typography>
            {isLoadingInfo ? <Skeleton width={22} height={14} /> : (
              <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.72rem' }}>{baseSpeed ?? '—'}</Typography>
            )}
          </Box>
        </Box>
        {hasMonster && (
          <IconButton size="small" onClick={onRemove} sx={{ flexShrink: 0, alignSelf: 'flex-start' }}>
            <CloseIcon sx={{ fontSize: 15 }} />
          </IconButton>
        )}
      </Box>

      {/* 입력 필드 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', display: 'block', mb: 0.4 }}>룬 속도 (+)</Typography>
          <TextField type="number" size="small" fullWidth value={slot.runeSpd || ''} placeholder="0"
            onChange={(e) => { const v = parseInt(e.target.value, 10); onChange({ runeSpd: isNaN(v) ? 0 : Math.max(0, Math.min(999, v)) }); }}
            inputProps={{ min: 0, max: 999, style: { textAlign: 'center', fontSize: '0.875rem', padding: '4px 6px' } }} />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', display: 'block', mb: 0.4 }}>ATB 부스트 %</Typography>
          <TextField type="number" size="small" fullWidth value={slot.atbBoost || ''} placeholder="0"
            onChange={(e) => { const v = parseInt(e.target.value, 10); onChange({ atbBoost: isNaN(v) ? 0 : Math.max(0, Math.min(100, v)) }); }}
            inputProps={{ min: 0, max: 100, style: { textAlign: 'center', fontSize: '0.875rem', padding: '4px 6px' } }} />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', display: 'block', mb: 0.4 }}>리더스킬 %</Typography>
          <TextField type="number" size="small" fullWidth value={slot.leaderSkillPct || ''} placeholder="0"
            onChange={(e) => { const v = parseInt(e.target.value, 10); onChange({ leaderSkillPct: isNaN(v) ? 0 : Math.max(0, Math.min(100, v)) }); }}
            inputProps={{ min: 0, max: 100, style: { textAlign: 'center', fontSize: '0.875rem', padding: '4px 6px' } }} />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', display: 'block', mb: 0.4 }}>건물 보너스 %</Typography>
          <TextField type="number" size="small" fullWidth value={slot.towerBonusPct || ''} placeholder="0"
            onChange={(e) => { const v = parseInt(e.target.value, 10); onChange({ towerBonusPct: isNaN(v) ? 0 : Math.max(0, Math.min(100, v)) }); }}
            inputProps={{ min: 0, max: 100, style: { textAlign: 'center', fontSize: '0.875rem', padding: '4px 6px' } }} />
        </Box>
      </Box>

      {/* 신속 룬 토글 */}
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={slot.swiftSet}
            onChange={(e) => onChange({ swiftSet: e.target.checked })}
          />
        }
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <BoltIcon sx={{ fontSize: 14, color: slot.swiftSet ? 'warning.main' : 'text.disabled' }} />
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
              신속 룬 세트 (+{baseSpeed ? Math.floor(baseSpeed * 0.25) : '?'})
            </Typography>
          </Box>
        }
        sx={{ m: 0 }}
      />
    </Box>
  );
}

// ─── 시뮬레이션 결과 뷰 ──────────────────────────────────────────────────────

interface SimResultProps {
  events: TurnEvent[];
  allyNames: Map<number, { name: string; imageUrl?: string }>;
  enemyNames: Map<number, { name: string; imageUrl?: string }>;
  showEnemy: boolean;
}

function SimResultView({ events, allyNames, enemyNames, showEnemy }: SimResultProps) {
  const allNames = new Map([...allyNames, ...enemyNames]);

  if (events.length === 0) {
    return (
      <Box sx={{ py: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">몬스터를 선택하고 속도를 입력하면 시뮬레이션 결과가 표시됩니다.</Typography>
      </Box>
    );
  }

  // 틱 그룹화
  const byTick = new Map<number, TurnEvent[]>();
  for (const ev of events) {
    if (!byTick.has(ev.tick)) byTick.set(ev.tick, []);
    byTick.get(ev.tick)!.push(ev);
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 360, overflow: 'auto', pr: 0.5 }}>
      {events.map((ev, idx) => {
        const info = allNames.get(ev.monsterId);
        const isAlly = !ev.isEnemy;
        return (
          <Box
            key={idx}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              py: 0.75,
              px: 1,
              borderRadius: 1.5,
              bgcolor: isAlly ? 'rgba(25,118,210,0.06)' : 'rgba(211,47,47,0.06)',
              border: '1px solid',
              borderColor: isAlly ? 'primary.100' : 'error.100',
            }}
          >
            <Typography
              variant="caption"
              sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'text.secondary', minWidth: 28, fontSize: '0.72rem' }}
            >
              T{ev.tick}
            </Typography>
            <Chip
              label={idx + 1}
              size="small"
              color={isAlly ? 'primary' : 'error'}
              sx={{ minWidth: 28, height: 18, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.75 } }}
            />
            {info?.imageUrl && (
              <Image
                src={getRenderableImageUrl(info.imageUrl)}
                alt={info.name}
                width={20}
                height={20}
                style={{ objectFit: 'contain', borderRadius: 4 }}
                unoptimized
              />
            )}
            <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: isAlly ? 600 : 400, flex: 1 }}>
              {ev.monsterName}
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.68rem', color: 'text.secondary' }}>
              잔여 {ev.atbAfterTurn.toFixed(1)}%
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

// ─── 공속 참고표 ─────────────────────────────────────────────────────────────

const SPEED_REF_ROWS = [
  { label: '초고속 (점령 선턴)', range: '400+', color: '#1565C0' },
  { label: '고속', range: '350–399', color: '#0277BD' },
  { label: '상속', range: '300–349', color: '#00695C' },
  { label: '중속', range: '250–299', color: '#2E7D32' },
  { label: '하속', range: '200–249', color: '#F57F17' },
  { label: '저속', range: '~199', color: '#BF360C' },
];

function SpeedReferenceTable() {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>공속 구간 참고</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>구분</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>공속 범위</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {SPEED_REF_ROWS.map((row) => (
            <TableRow key={row.label}>
              <TableCell>
                <Chip label={row.label} size="small" sx={{ bgcolor: row.color, color: '#fff', fontSize: '0.7rem', height: 22 }} />
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.range}</Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Alert severity="info" sx={{ mt: 2, fontSize: '0.75rem' }}>
        ※ 공속 구간은 커뮤니티 통용 기준이며 실제 게임과 다를 수 있습니다.
      </Alert>
    </Box>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function SpeedCalculatorClient() {
  const [activeTab, setActiveTab] = useState<TabKey>('siege');
  const [slots, setSlots] = useState<MonsterSlot[]>(
    Array.from({ length: TOTAL_SLOT_COUNT }, (_, i) => ({ ...EMPTY_SLOT, isEnemy: i >= ALLY_SLOT_COUNT })),
  );
  const [showEnemy, setShowEnemy] = useState(false);
  const [pickerOpenIdx, setPickerOpenIdx] = useState<number | null>(null);

  const { data: monsterList = [], isLoading: isMonsterLoading } = useMonsterList({ siegeDedupeSecondAwakening: true });

  // 슬롯별 기본속 조회 (훅은 6개 고정)
  const infos = [
    useMonsterInfo(slots[0].monster?.monster_id ?? null), // eslint-disable-line react-hooks/rules-of-hooks
    useMonsterInfo(slots[1].monster?.monster_id ?? null), // eslint-disable-line react-hooks/rules-of-hooks
    useMonsterInfo(slots[2].monster?.monster_id ?? null), // eslint-disable-line react-hooks/rules-of-hooks
    useMonsterInfo(slots[3].monster?.monster_id ?? null), // eslint-disable-line react-hooks/rules-of-hooks
    useMonsterInfo(slots[4].monster?.monster_id ?? null), // eslint-disable-line react-hooks/rules-of-hooks
    useMonsterInfo(slots[5].monster?.monster_id ?? null), // eslint-disable-line react-hooks/rules-of-hooks
  ];
  const baseSpeeds = infos.map((q) => q.data?.speed ?? null);

  const updateSlot = useCallback((idx: number, patch: Partial<MonsterSlot>) => {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }, []);

  const removeSlot = useCallback((idx: number) => {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...EMPTY_SLOT, isEnemy: i >= ALLY_SLOT_COUNT } : s)));
  }, []);

  // 최종 공속 계산 (슬롯별)
  const finalSpds = useMemo(() =>
    slots.map((slot, i) => {
      const base = baseSpeeds[i];
      if (!base) return 0;
      return calcFinalSpd(base, slot.runeSpd, slot.swiftSet, slot.leaderSkillPct, slot.towerBonusPct);
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slots, ...baseSpeeds],
  );

  // 시뮬레이션용 SimMonster 배열
  const simMonsters = useMemo((): SimMonster[] => {
    const result: SimMonster[] = [];
    let allyOrder = 0;
    let enemyOrder = 0;
    for (let i = 0; i < TOTAL_SLOT_COUNT; i++) {
      const slot = slots[i];
      const spd = finalSpds[i];
      if (!spd) continue;
      const isEnemy = i >= ALLY_SLOT_COUNT;
      result.push({
        id: i,
        name: slot.monster ? (slot.monster.modified_kr_name ?? slot.monster.kr_name) : (isEnemy ? `적 ${i - ALLY_SLOT_COUNT + 1}` : `아군 ${i + 1}`),
        imageUrl: slot.monster?.image_url,
        finalSpd: spd,
        atbBoost: slot.atbBoost,
        isEnemy,
        teamOrder: isEnemy ? enemyOrder++ : allyOrder++,
      });
    }
    return result;
  }, [slots, finalSpds]);

  // 실제 시뮬레이션 (적 포함 여부에 따라 필터)
  const simInput = useMemo(() =>
    showEnemy ? simMonsters : simMonsters.filter((m) => !m.isEnemy),
    [simMonsters, showEnemy],
  );

  const events = useMemo(() => simulateTicks(simInput), [simInput]);

  const allyNameMap = useMemo(() => {
    const m = new Map<number, { name: string; imageUrl?: string }>();
    for (const sm of simMonsters.filter((x) => !x.isEnemy)) {
      m.set(sm.id, { name: sm.name, imageUrl: sm.imageUrl });
    }
    return m;
  }, [simMonsters]);

  const enemyNameMap = useMemo(() => {
    const m = new Map<number, { name: string; imageUrl?: string }>();
    for (const sm of simMonsters.filter((x) => x.isEnemy)) {
      m.set(sm.id, { name: sm.name, imageUrl: sm.imageUrl });
    }
    return m;
  }, [simMonsters]);

  const tabs: { key: TabKey; label: string; disabled?: boolean }[] = [
    { key: 'siege', label: '점령용' },
    { key: 'arena', label: '아레나용', disabled: true },
    { key: 'speed-table', label: '공속 참고표' },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
      <Box sx={{ mb: 2 }}>
        <PageHeader title="공속 순서 계산기" />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          SW 실제 공식 기반 틱 시뮬레이션으로 공격 순서를 계산합니다.
        </Typography>
      </Box>

      {/* 탭 */}
      <Box sx={{ display: 'flex', gap: 0.5, p: 0.75, bgcolor: 'grey.100', borderRadius: '8px 8px 0 0', border: '1px solid', borderBottom: 0, borderColor: 'divider', width: 'fit-content' }}>
        {tabs.map((tab) => (
          <Box
            key={tab.key}
            component="button"
            onClick={() => !tab.disabled && setActiveTab(tab.key)}
            disabled={tab.disabled}
            sx={{ px: 2.5, py: 0.875, fontSize: '0.8125rem', fontWeight: 600, borderRadius: 1.5, border: 'none', cursor: tab.disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s', bgcolor: activeTab === tab.key ? 'primary.main' : 'transparent', color: tab.disabled ? 'text.disabled' : activeTab === tab.key ? 'white' : 'text.secondary', '&:hover:not(:disabled)': { color: 'text.primary' } }}
          >
            {tab.label}
            {tab.disabled && <Box component="span" sx={{ fontSize: '0.6rem', ml: 0.5, opacity: 0.7 }}>(준비중)</Box>}
          </Box>
        ))}
      </Box>

      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '0 8px 8px 8px', bgcolor: 'background.paper', overflow: 'hidden' }}>
        <Box sx={{ height: 4, background: 'linear-gradient(90deg, #1976d2, #42a5f5, #1976d2)' }} />

        {activeTab === 'speed-table' ? <SpeedReferenceTable /> : (
          <Box sx={{ p: { xs: 1.5, sm: 2 } }}>

            {/* 2열: 입력 슬롯 | 시뮬레이션 결과 */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>

              {/* 왼쪽: 슬롯 입력 */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {/* 아군 */}
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                    아군 (공격 순서 순)
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                    {[0, 1, 2].map((i) => (
                      <SlotCard
                        key={i}
                        slot={slots[i]}
                        label={i === 0 ? '선턴' : `${i + 1}번째`}
                        color={i === 0 ? 'primary' : 'default'}
                        baseSpeed={baseSpeeds[i]}
                        isLoadingInfo={infos[i].isLoading}
                        finalSpd={finalSpds[i]}
                        onClickPortrait={() => setPickerOpenIdx(i)}
                        onRemove={() => removeSlot(i)}
                        onChange={(patch) => updateSlot(i, patch)}
                      />
                    ))}
                  </Box>
                </Box>

                {/* 적 슬롯 토글 */}
                <Box>
                  <FormControlLabel
                    control={<Switch size="small" checked={showEnemy} onChange={(e) => setShowEnemy(e.target.checked)} />}
                    label={<Typography variant="caption" sx={{ fontWeight: 700, color: 'error.main', letterSpacing: '0.08em', textTransform: 'uppercase' }}>적 포함 시뮬레이션</Typography>}
                    sx={{ m: 0 }}
                  />
                  {showEnemy && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 1 }}>
                      {[3, 4, 5].map((i) => (
                        <SlotCard
                          key={i}
                          slot={slots[i]}
                          label={`적 ${i - 2}`}
                          color="error"
                          baseSpeed={baseSpeeds[i]}
                          isLoadingInfo={infos[i].isLoading}
                          finalSpd={finalSpds[i]}
                          onClickPortrait={() => setPickerOpenIdx(i)}
                          onRemove={() => removeSlot(i)}
                          onChange={(patch) => updateSlot(i, patch)}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>

              {/* 오른쪽: 시뮬레이션 결과 */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    턴 순서 시뮬레이션
                  </Typography>
                  {events.length > 0 && (
                    <Chip label={`${events.length}턴`} size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 18 }} />
                  )}
                </Box>

                {/* 공속 요약 테이블 */}
                {simMonsters.filter((m) => m.finalSpd > 0).length > 0 && (
                  <Box sx={{ mb: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          {['몬스터', '기본속', '최종공속', '신속', 'ATB부스트'].map((h, i) => (
                            <TableCell key={h} align={i >= 2 ? 'center' : 'left'} sx={{ fontWeight: 700, fontSize: '0.68rem', color: 'text.secondary', borderBottom: '2px solid', borderColor: 'divider', py: 0.75 }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {simMonsters.filter((m) => m.finalSpd > 0).map((m) => {
                          const slotIdx = m.id;
                          const base = baseSpeeds[slotIdx];
                          return (
                            <TableRow key={m.id} sx={{ bgcolor: m.isEnemy ? 'rgba(211,47,47,0.03)' : undefined, '&:not(:last-child) td': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                  {m.imageUrl && <Image src={getRenderableImageUrl(m.imageUrl)} alt={m.name} width={18} height={18} style={{ objectFit: 'contain', borderRadius: 3 }} unoptimized />}
                                  <Typography variant="body2" sx={{ fontSize: '0.78rem', color: m.isEnemy ? 'error.main' : 'text.primary' }} noWrap>{m.name}</Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center"><Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{base ?? '—'}</Typography></TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem', color: m.isEnemy ? 'error.main' : 'primary.main' }}>{m.finalSpd}</Typography>
                              </TableCell>
                              <TableCell align="center">{slots[slotIdx].swiftSet && <BoltIcon sx={{ fontSize: 14, color: 'warning.main' }} />}</TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" sx={{ fontSize: '0.78rem', fontFamily: 'monospace' }}>{m.atbBoost > 0 ? `+${m.atbBoost}%` : '—'}</Typography>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Box>
                )}

                <Divider sx={{ mb: 1.5 }} />

                <SimResultView events={events} allyNames={allyNameMap} enemyNames={enemyNameMap} showEnemy={showEnemy} />

                {events.length > 0 && (
                  <Box sx={{ mt: 1.5, p: 1.25, bgcolor: 'grey.50', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7, display: 'block', fontSize: '0.7rem' }}>
                      ※ <strong>최종공속</strong> = 기본속 + 룬속도 + floor(기본속 × 0.25 if 신속) + round(기본속 × (리더+건물)%)<br />
                      ※ 매 틱마다 ATB += 최종공속 × 0.07, 임계값 100 도달 시 행동, 초과분 보존<br />
                      ※ ATB 부스트는 해당 몬스터 행동 시 아군 전체에 즉시 적용
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* 몬스터 픽커 */}
      <MonsterPicker
        open={pickerOpenIdx !== null}
        onClose={() => setPickerOpenIdx(null)}
        onSelect={(monster) => { if (pickerOpenIdx !== null) updateSlot(pickerOpenIdx, { monster }); }}
        monsterList={monsterList}
        isLoading={isMonsterLoading}
      />
    </Container>
  );
}
