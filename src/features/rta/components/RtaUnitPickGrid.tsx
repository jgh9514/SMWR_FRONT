'use client';

import { Box, Stack, Avatar, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import AttributeElementIcon from '@/shared/ui/attribute-element-icon/AttributeElementIcon';
import { parseMonsterElemental } from '@/shared/utils/monsterElemental';
import { getMonsterImageUrl } from '@/shared/utils/image';

type Unit = {
  image: string;
  name: string;
  banned?: boolean;
  leader?: boolean;
  pickSlotNo?: number;
  elemental?: string;
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
  const elementAttr = parseMonsterElemental(unit.elemental);

  /* 리더: 빨간 테두리 / 벤: 테두리 없음(투명) / 일반: 연한 테두리 */
  const borderSpec = banned
    ? '2px solid transparent'
    : leader
      ? '2px solid rgba(211, 47, 47, 0.92)'
      : '2px solid rgba(255, 255, 255, 0.22)';

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
          {elementAttr != null && (
            <Box
              sx={{
                position: 'absolute',
                top: 2,
                right: 2,
                zIndex: 3,
                pointerEvents: 'none',
                lineHeight: 0,
                filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.55))',
              }}
            >
              <AttributeElementIcon attribute={elementAttr} size={14} titleAccess={`속성 ${elementAttr}`} />
            </Box>
          )}
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
        pt: 0.25,
        pb: '10px',
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
