import type { DeckMonsterRuneSelection, RuneMaster } from '@/features/siege/types/rune';

const MAX_RUNE_PIECES = 6;

export function sumRunePieces(
  selection: DeckMonsterRuneSelection,
  runeById: Map<number, RuneMaster>,
): number {
  let sum = 0;
  for (const id of [selection.runeId1, selection.runeId2, selection.runeId3]) {
    if (id == null) continue;
    const rune = runeById.get(id);
    if (rune) sum += rune.required_pieces;
  }
  return sum;
}

export function isRuneSelectionValid(
  selection: DeckMonsterRuneSelection,
  runeById: Map<number, RuneMaster>,
): boolean {
  for (const id of [selection.runeId1, selection.runeId2, selection.runeId3]) {
    if (id != null && !runeById.has(id)) return false;
  }
  return sumRunePieces(selection, runeById) <= MAX_RUNE_PIECES;
}

export function runeSelectionErrorMessage(
  selection: DeckMonsterRuneSelection,
  runeById: Map<number, RuneMaster>,
): string | null {
  for (const id of [selection.runeId1, selection.runeId2, selection.runeId3]) {
    if (id != null && !runeById.has(id)) {
      return '유효하지 않은 룬 세트가 선택되었습니다.';
    }
  }
  const sum = sumRunePieces(selection, runeById);
  if (sum > MAX_RUNE_PIECES) {
    return `룬 합산은 ${MAX_RUNE_PIECES}개를 초과할 수 없습니다. (현재 ${sum}개)`;
  }
  return null;
}

export function selectionFromDeckMonsterStats(stats: {
  runeId1?: number | null;
  runeId2?: number | null;
  runeId3?: number | null;
}): DeckMonsterRuneSelection {
  return {
    runeId1: stats.runeId1 ?? null,
    runeId2: stats.runeId2 ?? null,
    runeId3: stats.runeId3 ?? null,
  };
}
