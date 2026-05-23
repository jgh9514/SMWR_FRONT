export interface AccountSummaryUploadResult {
  import_id: number;
  source_filename?: string | null;
  wizard_id?: number | null;
  wizard_name?: string | null;
  server_id?: number | null;
  unit_count: number;
  rune_count: number;
}

export interface LatestImportResponse {
  hasData: boolean;
  import?: {
    import_id: number;
    source_filename?: string | null;
    wizard_id?: number | null;
    wizard_name?: string | null;
    server_id?: number | null;
    unit_count: number;
    rune_count: number;
    uploaded_at: string;
  };
}

export interface ImportListItem {
  import_id: number;
  source_filename?: string | null;
  wizard_id?: number | null;
  wizard_name?: string | null;
  server_id?: number | null;
  unit_count: number;
  rune_count: number;
  uploaded_at: string;
}

export interface ImportDetailResponse {
  hasData: boolean;
  import?: ImportListItem & { user_id?: string | null };
}

export interface PagedItems<T> {
  items: T[];
  total: number;
}

export interface SwexMonsterItem {
  unit_id: number;
  master_id?: number | null;
  kr_name?: string | null;
  un_name?: string | null;
  level?: number | null;
  stars?: number | null;
  attribute?: number | null;
  awaken_level?: number | null;
  is_awakened?: number | null;
}

export interface SwexMonsterCatalogItem {
  monster_id: string;
  com2us_id?: number | null;
  monster_elemental?: string | null;
  kr_name: string;
  un_name: string;
  image_url?: string | null;
  owned_count: number;
}

export interface SwexRuneItem {
  rune_id: number;
  unit_id?: number | null;
  slot?: number | null;
  set_id?: number | null;
  grade?: number | null;
  level?: number | null;
  rank?: number | null;
  main_stat_type?: number | null;
  main_stat_value?: number | null;
  substats_json?: unknown;
}

export interface RuneSpeedBuildSummary {
  label: string;
  fillerType: 'junk' | 'will' | string;
  swiftPieceCount: number;
  fillerPieceCount: number;
  swiftSpeedSum: number;
  fillerSpeedSum: number;
  flatSum: number;
  setBonusApplied: boolean;
  setBonusPercent: number;
  totalSpeed: number;
}

export interface RuneScoreSummaryResponse {
  hasData: boolean;
  import_id?: number;
  speed?: {
    swiftPlusJunk: RuneSpeedBuildSummary;
    swiftPlusWill: RuneSpeedBuildSummary;
  };
  speedFormula?: string;
}


