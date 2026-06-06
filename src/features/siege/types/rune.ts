/** 룬 세트 마스터 (rune_master) */
export interface RuneMaster {
  rune_id: number;
  name_ko: string;
  name_en: string;
  required_pieces: number;
  set_effect?: string;
  image_url?: string;
}

export interface DeckMonsterRuneSelection {
  runeId1: number | null;
  runeId2: number | null;
  runeId3: number | null;
}

export interface DeckMonsterRuneDisplay {
  runeId: number;
  nameKo: string;
  imageUrl: string | null;
  requiredPieces: number;
}

export const EMPTY_RUNE_SELECTION: DeckMonsterRuneSelection = {
  runeId1: null,
  runeId2: null,
  runeId3: null,
};
