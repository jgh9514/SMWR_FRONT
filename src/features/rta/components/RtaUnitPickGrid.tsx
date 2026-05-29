'use client';

import Link from 'next/link';
import { Box, Stack, Avatar, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { getMonsterImageUrl } from '@/shared/utils/image';

type Unit = {
  image: string;
  name: string;
  banned?: boolean;
  leader?: boolean;
  pickSlotNo?: number;
  monsterId?: string;
};

/**
 * SW 월드 아레나 스네이크 픽 레이아웃 — 플레이어 팀 기준 {@code pick_slot_no}는 **항상 1~5**(전장 전체 1~10 순서 미사용).
 *
 * - **선턴** (선픽 참가자): 열 패턴 {@code [[1],[2,3],[4,5]]} → 화면 1-2-2
 * - **후턴**: 열 패턴 {@code [[1,2],[3,4],[5]]} → 화면 2-2-1 (후턴 "첫 픽 칸" = 팀 로컬 1번)
 *
 * `pick_slot_no`가 칸별로 채워지면 슬롯 번호로 열 배치. 없거나 패턴 불일치면
 * `units[]` 배열 순(이미 픽 순)으로 같은 열 패턴 폴백.
 * **절대 미러링으로 순서 속이지 않을 것.** `rowAlign`은 VS 줄에서 블록 끝 정렬만 담당.
 */

/** 픽 순서 불명일 때: 배열 0..4 순서가 곧 해당 팀의 pick_slot 1→5 순 */
const COL_GROUPS_FIRST_PICK: readonly (readonly number[])[] = [[0], [1, 2], [3, 4]] as const;
const COL_GROUPS_SECOND_PICK: readonly (readonly number[])[] = [[0, 1], [2, 3], [4]] as const;

/** 선턴 플레이어: 팀 픽 번호(slots)별 열 분배 (1 │ 2·3 │ 4·5) */
const SNAKE_PICK_SLOTS_FIRST_TEAM: readonly (readonly number[])[] = [[1], [2, 3], [4, 5]] as const;
/** 후턴 플레이어: (1·2 │ 3·4 │ 5) */
const SNAKE_PICK_SLOTS_SECOND_TEAM: readonly (readonly number[])[] = [[1, 2], [3, 4], [5]] as const;


function allHavePickSlotNo(list: Unit[]): boolean {
  return list.length > 0 && list.every((u) => u.pickSlotNo != null && Number.isFinite(Number(u.pickSlotNo)));
}

function buildIndexColumns(
  list: Unit[],
  isFirstPickInDraft: boolean,
): { unit: Unit; unitIndex: number }[][] {
  const g = isFirstPickInDraft ? COL_GROUPS_FIRST_PICK : COL_GROUPS_SECOND_PICK;
  return g.map((idxs) =>
    idxs
      .map((i) => (list[i] != null ? { unit: list[i]!, unitIndex: i } : null))
      .filter((x): x is { unit: Unit; unitIndex: number } => x != null),
  );
}

/**
 * `pick_slot_no` 가 팀 기준 `1..5`일 때 같은 숫자로 열에 배치한다.
 */
function buildSnakeColumnsByPickSlot(
  list: Unit[],
  isFirstPickInDraft: boolean,
): { unit: Unit; unitIndex: number }[][] | null {
  if (!allHavePickSlotNo(list)) return null;

  const pattern = isFirstPickInDraft ? SNAKE_PICK_SLOTS_FIRST_TEAM : SNAKE_PICK_SLOTS_SECOND_TEAM;
  const bucket: { unit: Unit; unitIndex: number; pickSlotNo: number }[][] = [[], [], []];

  for (let unitIndex = 0; unitIndex < list.length; unitIndex++) {
    const unit = list[unitIndex]!;
    const pickSlotNo = Math.round(Number(unit.pickSlotNo));
    let col = -1;
    for (let c = 0; c < 3; c++) {
      if (pattern[c]!.includes(pickSlotNo)) {
        col = c;
        break;
      }
    }
    if (col < 0) return null;
    bucket[col]!.push({ unit, unitIndex, pickSlotNo });
  }

  for (const b of bucket) {
    b.sort((a, x) => a.pickSlotNo - x.pickSlotNo);
  }
  return bucket.map((b) => b.map(({ unit, unitIndex }) => ({ unit, unitIndex })));
}

function buildColumns(
  list: Unit[],
  isFirstPickInDraft: boolean,
): { usedPickSlotSnake: boolean; columns: { unit: Unit; unitIndex: number }[][] } {
  const bySlot = buildSnakeColumnsByPickSlot(list, isFirstPickInDraft);
  if (bySlot) {
    return { usedPickSlotSnake: true, columns: bySlot };
  }
  return { usedPickSlotSnake: false, columns: buildIndexColumns(list, isFirstPickInDraft) };
}

function showSeonPickBadge(
  isFirstPickInDraft: boolean,
  unit: Unit,
  unitIndex: number,
  usedPickSlotSnake: boolean,
): boolean {
  if (!isFirstPickInDraft) return false;
  if (usedPickSlotSnake) return Math.round(Number(unit.pickSlotNo)) === 1;
  return unitIndex === 0;
}

function BanMonOverlayLayers() {
  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          bgcolor: 'rgba(0, 0, 0, 0.2)',
          borderRadius: 'inherit',
          zIndex: 1,
          pointerEvents: 'none',
        }}
        aria-hidden
      />
      <Box
        component="svg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        sx={{
          position: 'absolute',
          right: '2px',
          bottom: '2px',
          display: 'block',
          width: { xs: 15, sm: 17 },
          height: { xs: 15, sm: 17 },
          zIndex: 2,
          color: 'rgba(251, 113, 133, 0.98)',
          filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.75))',
          pointerEvents: 'none',
        }}
        aria-hidden
      >
        <path d="M4.929 4.929 19.07 19.071" />
        <circle cx="12" cy="12" r="10" />
      </Box>
    </>
  );
}

function PickSlotTile({
  unit,
  showSeonPick,
}: {
  unit: Unit;
  showSeonPick: boolean;
}) {
  const leader = unit.leader === true;
  const banned = unit.banned === true;

  /* 리더: 빨간 테두리 / 벤: 테두리 없음(투명) / 일반: 연한 테두리 */
  const borderSpec = banned
    ? '2px solid transparent'
    : leader
      ? '2px solid rgba(211, 47, 47, 0.92)'
      : '2px solid rgba(255, 255, 255, 0.22)';

  const tile = (
    <Box sx={{ position: 'relative' }} title={leader ? `${unit.name} (리더)` : unit.name}>
      {showSeonPick && (
        <Box
          sx={{
            position: 'absolute',
            top: -10,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          <Box
            component="span"
            sx={{
              px: 0.5,
              py: 0.125,
              fontSize: { xs: '6px', sm: '7px' },
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              bgcolor: '#3b82f6',
              color: '#fff',
              borderRadius: 0.5,
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
            }}
          >
            선픽
          </Box>
        </Box>
      )}
      <Box
        sx={(theme) => ({
          position: 'relative',
          borderRadius: 1,
          overflow: 'visible',
          boxSizing: 'border-box',
          border: borderSpec,
          bgcolor:
            theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.1)',
          width: { xs: 36, sm: 40 },
          height: { xs: 36, sm: 40 },
          flexShrink: 0,
          transition: 'border-color 0.2s, transform 0.2s, filter 0.2s',
          '@media (hover: hover)': {
            '&:hover': {
              borderColor: banned
                ? 'transparent'
                : leader
                  ? 'rgba(239, 68, 68, 0.98)'
                  : alpha(theme.palette.primary.main, 0.55),
              filter: theme.palette.mode === 'dark' ? 'brightness(1.12)' : 'brightness(1.05)',
              transform: 'scale(1.06)',
            },
          },
        })}
      >
        <Box sx={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 1 }}>
          <Avatar
            src={getMonsterImageUrl(unit.image)}
            alt={unit.name}
            variant="rounded"
            sx={{
              width: '100%',
              height: '100%',
              borderRadius: 1,
              border: 'none',
              '& .MuiAvatar-img': { objectFit: 'cover' },
            }}
          />
          {banned && <BanMonOverlayLayers />}
        </Box>
        {leader && (
          <Box
            sx={{
              position: 'absolute',
              left: '-6px',
              bottom: '-6px',
              width: { xs: 13, sm: 15 },
              height: { xs: 13, sm: 15 },
              backgroundColor: '#c62828',
              clipPath: 'polygon(0% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.35)',
              zIndex: 4,
              pointerEvents: 'none',
            }}
            aria-hidden
          >
            <Typography
              sx={{
                position: 'relative',
                top: -0.75,
                color: '#fff',
                fontSize: { xs: '7px', sm: '8px' },
                fontWeight: 'bold',
                lineHeight: 1,
              }}
            >
              L
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );

  if (!banned && unit.monsterId) {
    return (
      <Link href={`/monster-detail/${unit.monsterId}`} onClick={(e) => e.stopPropagation()} style={{ display: 'contents' }}>
        {tile}
      </Link>
    );
  }
  return tile;
}

/**
 * 스네이크 픽 레이아웃 1-2-2 / 2-2-1, `rowAlign`으로 VS 행 끝 정렬
 */
export default function RtaUnitPickGrid({
  units,
  isFirstPickInDraft,
  rowAlign,
}: {
  units: Unit[];
  isFirstPickInDraft: boolean;
  rowAlign: 'start' | 'end';
}) {
  const list = (units ?? []).slice(0, 5);
  const { usedPickSlotSnake, columns: groups } = buildColumns(list, isFirstPickInDraft);

  if (list.length === 0) {
    return (
      <Box sx={{ py: 0.5, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
          몬스터 정보가 없습니다
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: rowAlign === 'end' ? 'flex-end' : 'flex-start',
        gap: 1.5,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        flexWrap: 'nowrap',
        overflow: 'visible',
        direction: 'ltr',
        pt: '12px',
        pb: '10px',
        pl: '6px',
        pr: '6px',
      }}
    >
      {groups.map((col, colIdx) => {
        if (col.length === 0) return null;
        return (
          <Stack
            key={`rta-pick-col-${isFirstPickInDraft ? 'f' : 's'}-${usedPickSlotSnake ? 'p' : 'i'}-${colIdx}`}
            direction="column"
            alignItems="center"
            gap={0.5}
            sx={{ flexShrink: 0, minWidth: 0 }}
          >
            {col.map(({ unit, unitIndex }) => (
              <PickSlotTile
                key={unitIndex}
                unit={unit}
                showSeonPick={showSeonPickBadge(isFirstPickInDraft, unit, unitIndex, usedPickSlotSnake)}
              />
            ))}
          </Stack>
        );
      })}
    </Box>
  );
}
