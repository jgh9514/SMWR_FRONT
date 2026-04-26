'use client';

import { Box, Stack, Avatar, Typography } from '@mui/material';
import { getMonsterImageUrl } from '@/shared/utils/image';

type Unit = {
  image: string;
  name: string;
  banned?: boolean;
  leader?: boolean;
  pickSlotNo?: number;
};

/**
 * SW 월드 아레나 스네이크 픽(1-2-2-2-2-1) — **전체 드래프트 턴** 기준
 *
 * - **선픽(First pick) 팀** — 픽 1, (4·5), (8·9) → 화면 **1-2-2** (세 열)
 * - **후픽(Second pick) 팀** — 픽 (2·3), (6·7), 10 → 화면 **2-2-1**
 *
 * `pick_slot_no`가 모두 있으면 위 턴으로 열에 배치. 없거나 턴이 규칙에 안 맞으면
 * `units[]` 순서(이미 pick 순)로 `[[0][1,2][3,4]]` / `[[0,1][2,3][4]]` 폴백.
 * **절대 `transform: scaleX(-1)`(미러)로 역순 흉내 내지 말 것.**
 * `rowAlign`: VS 행에서 블록 전체를 왼/오 끝에 붙이는 용도만(열/턴 순서와 무관)
 */

/** 인덱스 폴백: pick_slot이 없을 때, 배열 0~4 = 팀의 1·4·5·8·9 / 2·3·6·7·10 순서라는 가정 */
const COL_GROUPS_FIRST_PICK: readonly (readonly number[])[] = [[0], [1, 2], [3, 4]] as const;
const COL_GROUPS_SECOND_PICK: readonly (readonly number[])[] = [[0, 1], [2, 3], [4]] as const;

/** 선픽 팀: 턴 1 | 4,5 | 8,9 */
const SNAKE_TURNS_FIRST: readonly (readonly number[])[] = [[1], [4, 5], [8, 9]] as const;
/** 후픽 팀: 턴 2,3 | 6,7 | 10 */
const SNAKE_TURNS_SECOND: readonly (readonly number[])[] = [
  [2, 3],
  [6, 7],
  [10],
] as const;

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
 * `pick_slot_no` = 글로벌 턴(1~10)일 때, 스네이크 규칙으로 3열 스택에 분배
 */
function buildSnakeColumnsByTurn(
  list: Unit[],
  isFirstPickInDraft: boolean,
): { unit: Unit; unitIndex: number }[][] | null {
  if (!allHavePickSlotNo(list)) return null;

  const pattern = isFirstPickInDraft ? SNAKE_TURNS_FIRST : SNAKE_TURNS_SECOND;
  const bucket: { unit: Unit; unitIndex: number; turn: number }[][] = [[], [], []];

  for (let unitIndex = 0; unitIndex < list.length; unitIndex++) {
    const unit = list[unitIndex]!;
    const turn = Math.round(Number(unit.pickSlotNo));
    let col = -1;
    for (let c = 0; c < 3; c++) {
      if (pattern[c]!.includes(turn)) {
        col = c;
        break;
      }
    }
    if (col < 0) return null;
    bucket[col]!.push({ unit, unitIndex, turn });
  }

  for (const b of bucket) {
    b.sort((a, x) => a.turn - x.turn);
  }
  return bucket.map((b) => b.map(({ unit, unitIndex }) => ({ unit, unitIndex })));
}

function buildColumns(
  list: Unit[],
  isFirstPickInDraft: boolean,
): { usedTurnSnake: boolean; columns: { unit: Unit; unitIndex: number }[][] } {
  const byTurn = buildSnakeColumnsByTurn(list, isFirstPickInDraft);
  if (byTurn) {
    return { usedTurnSnake: true, columns: byTurn };
  }
  return { usedTurnSnake: false, columns: buildIndexColumns(list, isFirstPickInDraft) };
}

function showSeonPickBadge(
  isFirstPickInDraft: boolean,
  unit: Unit,
  unitIndex: number,
  usedTurnSnake: boolean,
): boolean {
  if (!isFirstPickInDraft) return false;
  if (usedTurnSnake) return Math.round(Number(unit.pickSlotNo)) === 1;
  return unitIndex === 0;
}

function BanMonOverlay() {
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(136, 19, 55, 0.5)',
        borderRadius: 1,
        zIndex: 1,
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      <Box
        component="svg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        sx={{ width: { xs: 16, sm: 20 }, height: { xs: 16, sm: 20 }, color: '#fb7185' }}
      >
        <path d="M4.929 4.929 19.07 19.071" />
        <circle cx="12" cy="12" r="10" />
      </Box>
    </Box>
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

  const ring = banned
    ? '0 0 0 2px rgba(244, 63, 94, 0.4)'
    : '0 0 0 2px rgba(255, 255, 255, 0.1)';

  return (
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
          overflow: 'hidden',
          bgcolor: 'rgba(0,0,0,0.4)',
          width: { xs: 36, sm: 40 },
          height: { xs: 36, sm: 40 },
          boxShadow: ring,
          flexShrink: 0,
          transition: 'box-shadow 0.2s, transform 0.2s',
          '@media (hover: hover)': {
            '&:hover': {
              boxShadow: `${ring}, 0 0 0 2px ${theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.55)' : 'rgba(37, 99, 235, 0.45)'}`,
              transform: 'scale(1.05)',
            },
          },
        })}
      >
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
        {banned && <BanMonOverlay />}
        {leader && (
          <Box
            sx={{
              position: 'absolute',
              left: 2,
              bottom: 2,
              width: { xs: 12, sm: 14 },
              height: { xs: 12, sm: 14 },
              backgroundColor: '#d32f2f',
              clipPath: 'polygon(0% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 2px 1px rgba(255, 255, 255, 0.8)',
              zIndex: 3,
            }}
            aria-hidden
          >
            <Typography
              sx={{
                color: '#fff',
                fontSize: { xs: '7px', sm: '8px' },
                fontWeight: 'bold',
                lineHeight: 1,
                textShadow: '0 0 1px rgba(255, 255, 255, 0.8)',
              }}
            >
              L
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
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
  const { usedTurnSnake, columns: groups } = buildColumns(list, isFirstPickInDraft);

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
        overflow: 'auto',
        direction: 'ltr',
        py: 0.25,
      }}
    >
      {groups.map((col, colIdx) => {
        if (col.length === 0) return null;
        return (
          <Stack
            key={`rta-pick-col-${isFirstPickInDraft ? 'f' : 's'}-${usedTurnSnake ? 't' : 'i'}-${colIdx}`}
            direction="column"
            alignItems="center"
            gap={0.5}
            sx={{ flexShrink: 0, minWidth: 0 }}
          >
            {col.map(({ unit, unitIndex }) => (
              <PickSlotTile
                key={unitIndex}
                unit={unit}
                showSeonPick={showSeonPickBadge(isFirstPickInDraft, unit, unitIndex, usedTurnSnake)}
              />
            ))}
          </Stack>
        );
      })}
    </Box>
  );
}
