import type { RuneMaster } from '@/features/siege/types/rune';
import { pickDeckField } from '@/features/siege/utils/deckRecord';

export function normalizeRuneMasterRow(row: Record<string, unknown>): RuneMaster | null {
  const runeIdRaw = pickDeckField(row, 'rune_id', 'runeId', 'runeid');
  if (runeIdRaw == null) return null;
  const rune_id = Number(runeIdRaw);
  if (!Number.isFinite(rune_id) || rune_id <= 0) return null;

  const nameKo = pickDeckField(row, 'name_ko', 'nameKo', 'nameko');
  const nameEn = pickDeckField(row, 'name_en', 'nameEn', 'nameen');
  const piecesRaw = pickDeckField(row, 'required_pieces', 'requiredPieces', 'requiredpieces');
  const setEffect = pickDeckField(row, 'set_effect', 'setEffect', 'seteffect');
  const imageUrl = pickDeckField(row, 'image_url', 'imageUrl', 'imageurl');

  return {
    rune_id,
    name_ko: nameKo != null ? String(nameKo) : '',
    name_en: nameEn != null ? String(nameEn) : '',
    required_pieces: Number(piecesRaw ?? 0),
    ...(setEffect != null ? { set_effect: String(setEffect) } : {}),
    ...(imageUrl != null ? { image_url: String(imageUrl) } : {}),
  };
}

export function normalizeRuneMasterList(data: unknown): RuneMaster[] {
  if (!Array.isArray(data)) return [];
  const out: RuneMaster[] = [];
  for (const row of data) {
    if (!row || typeof row !== 'object') continue;
    const normalized = normalizeRuneMasterRow(row as Record<string, unknown>);
    if (normalized) out.push(normalized);
  }
  return out;
}
