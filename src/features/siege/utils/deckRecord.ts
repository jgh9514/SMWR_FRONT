/**
 * MyBatis mapUnderscoreToCamelCase + sqlMap lowerCase 키 변형 대응
 * (deck_id → deckId → deckid, image_url1 → imageUrl1 → imageurl1 등)
 */

type DeckRow = Record<string, unknown>;

function pickField(row: DeckRow | null | undefined, ...keys: string[]): unknown {
  if (!row) return undefined;
  for (const key of keys) {
    const v = row[key];
    if (v !== null && v !== undefined && String(v).trim() !== '') {
      return v;
    }
  }
  return undefined;
}

/** MyBatis 키 변형 공통 조회 */
export function pickDeckField(row: DeckRow | null | undefined, ...keys: string[]): unknown {
  return pickField(row, ...keys);
}

/** 등록 공덱 PK (숫자 id만) */
export function resolveDeckId(row: DeckRow | null | undefined): string | null {
  const raw = pickField(row, 'deck_id', 'deckId', 'deckid', 'id');
  if (raw == null) return null;
  const s = String(raw).trim();
  return /^\d+$/.test(s) ? s : null;
}

export function resolveDefMonsters(row: DeckRow | null | undefined): {
  def_monster_1: string;
  def_monster_2: string;
  def_monster_3: string;
} | null {
  const d1 = pickField(row, 'def_monster_1', 'defMonster1', 'defmonster1');
  const d2 = pickField(row, 'def_monster_2', 'defMonster2', 'defmonster2');
  const d3 = pickField(row, 'def_monster_3', 'defMonster3', 'defmonster3');
  if (!d1 || !d2 || !d3) return null;
  return {
    def_monster_1: String(d1),
    def_monster_2: String(d2),
    def_monster_3: String(d3),
  };
}

export function resolveAtkMonsters(row: DeckRow | null | undefined): {
  atk_monster_1: string;
  atk_monster_2: string;
  atk_monster_3: string;
} | null {
  const a1 = pickField(row, 'atk_monster_1', 'atkMonster1', 'atkmonster1');
  const a2 = pickField(row, 'atk_monster_2', 'atkMonster2', 'atkmonster2');
  const a3 = pickField(row, 'atk_monster_3', 'atkMonster3', 'atkmonster3');
  if (!a1 || !a2 || !a3) return null;
  return {
    atk_monster_1: String(a1),
    atk_monster_2: String(a2),
    atk_monster_3: String(a3),
  };
}

/** deck-detail API 요청 body */
export function buildDeckDetailQueryParams(
  row: DeckRow | null | undefined,
  fallbackDef?: { dm1: string; dm2: string; dm3: string },
):
  | { deck_id: string }
  | {
      def_monster_1: string;
      def_monster_2: string;
      def_monster_3: string;
      atk_monster_1: string;
      atk_monster_2: string;
      atk_monster_3: string;
    }
  | null {
  const deckId = resolveDeckId(row);
  if (deckId) {
    return { deck_id: deckId };
  }

  const atk = resolveAtkMonsters(row);
  const def =
    resolveDefMonsters(row) ??
    (fallbackDef
      ? {
          def_monster_1: fallbackDef.dm1,
          def_monster_2: fallbackDef.dm2,
          def_monster_3: fallbackDef.dm3,
        }
      : null);

  if (def && atk) {
    return { ...def, ...atk };
  }
  return null;
}

export function resolveMonsterImageUrl(row: DeckRow | null | undefined, index: 1 | 2 | 3): string | undefined {
  const raw = pickField(
    row,
    `image_url${index}`,
    `imageUrl${index}`,
    `imageurl${index}`,
  );
  return raw != null ? String(raw) : undefined;
}

export function resolveMonsterKrName(row: DeckRow | null | undefined, index: 1 | 2 | 3): string {
  const raw = pickField(
    row,
    `m${index}_kr_name`,
    `m${index}KrName`,
    `m${index}krname`,
  );
  return raw != null ? String(raw).trim() : '';
}

export function pickDeckStat(row: DeckRow | null | undefined, monsterIndex: 1 | 2 | 3, statKey: string): unknown {
  const snake = `m${monsterIndex}_${statKey}`;
  const camel = `m${monsterIndex}${statKey
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')}`;
  const flat = snake.replace(/_/g, '').toLowerCase();
  return pickField(row, snake, camel, flat);
}
