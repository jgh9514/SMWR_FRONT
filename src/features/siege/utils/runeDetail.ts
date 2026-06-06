import { getMonsterImageUrl } from '@/shared/utils/image';
import type { DeckMonsterRuneDisplay, DeckMonsterRuneSelection } from '@/features/siege/types/rune';

type DetailRecord = Record<string, unknown>;

function parseRuneId(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function extractRuneSelectionFromDetail(detail: DetailRecord, monsterIndex: 1 | 2 | 3): DeckMonsterRuneSelection {
  return {
    runeId1: parseRuneId(detail[`m${monsterIndex}_rune_id_1`]),
    runeId2: parseRuneId(detail[`m${monsterIndex}_rune_id_2`]),
    runeId3: parseRuneId(detail[`m${monsterIndex}_rune_id_3`]),
  };
}

export function extractRuneDisplaysFromDetail(detail: DetailRecord, monsterIndex: 1 | 2 | 3): DeckMonsterRuneDisplay[] {
  const displays: DeckMonsterRuneDisplay[] = [];
  for (let slot = 1; slot <= 3; slot += 1) {
    const runeId = parseRuneId(detail[`m${monsterIndex}_rune_id_${slot}`]);
    if (runeId == null) continue;
    const imageRaw = detail[`m${monsterIndex}_rune_image_url_${slot}`];
    const nameRaw = detail[`m${monsterIndex}_rune_name_ko_${slot}`];
    const piecesRaw = detail[`m${monsterIndex}_rune_required_pieces_${slot}`];
    displays.push({
      runeId,
      nameKo: nameRaw != null ? String(nameRaw) : '',
      imageUrl: imageRaw != null ? getMonsterImageUrl(String(imageRaw)) : null,
      requiredPieces: piecesRaw != null ? Number(piecesRaw) : 0,
    });
  }
  return displays;
}
