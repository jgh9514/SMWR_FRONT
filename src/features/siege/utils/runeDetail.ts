import { getMonsterImageUrl } from '@/shared/utils/image';
import type { DeckMonsterRuneDisplay, DeckMonsterRuneSelection } from '@/features/siege/types/rune';

type DetailRecord = Record<string, unknown>;

function pickDetailField(detail: DetailRecord, monsterIndex: 1 | 2 | 3, suffix: string): unknown {
  const snake = `m${monsterIndex}_${suffix}`;
  const camelParts = suffix.split('_').map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)));
  const camel = `m${monsterIndex}${camelParts.join('')}`;
  const flat = snake.replace(/_/g, '').toLowerCase();
  return detail[snake] ?? detail[camel] ?? detail[flat];
}

function parseRuneId(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function extractRuneSelectionFromDetail(
  detail: DetailRecord,
  monsterIndex: 1 | 2 | 3,
  prefix = '',
): DeckMonsterRuneSelection {
  return {
    runeId1: parseRuneId(pickDetailField(detail, monsterIndex, `${prefix}rune_id_1`)),
    runeId2: parseRuneId(pickDetailField(detail, monsterIndex, `${prefix}rune_id_2`)),
    runeId3: parseRuneId(pickDetailField(detail, monsterIndex, `${prefix}rune_id_3`)),
  };
}

export function extractRuneDisplaysFromDetail(detail: DetailRecord, monsterIndex: 1 | 2 | 3): DeckMonsterRuneDisplay[] {
  const displays: DeckMonsterRuneDisplay[] = [];
  for (let slot = 1; slot <= 3; slot += 1) {
    const runeId = parseRuneId(pickDetailField(detail, monsterIndex, `rune_id_${slot}`));
    if (runeId == null) continue;
    const imageRaw = pickDetailField(detail, monsterIndex, `rune_image_url_${slot}`);
    const nameRaw = pickDetailField(detail, monsterIndex, `rune_name_ko_${slot}`);
    const piecesRaw = pickDetailField(detail, monsterIndex, `rune_required_pieces_${slot}`);
    displays.push({
      runeId,
      nameKo: nameRaw != null ? String(nameRaw) : '',
      imageUrl: imageRaw != null ? getMonsterImageUrl(String(imageRaw)) : null,
      requiredPieces: piecesRaw != null ? Number(piecesRaw) : 0,
    });
  }
  return displays;
}
