/**
 * 점령전 로그 파일 파싱 — GetGuildSiegeBattleLog 응답의 `log_list`만 사용.
 * GetGuildSiegeRankingInfo·월드 랭킹 등 다른 API 응답은 제외.
 */

export type RawGuildInfo = {
  guild_id?: string | number | null;
  guild_name?: string | null;
  rating_id?: number;
  match_rank?: string | number | null;
  siege_id?: string | number | null;
  match_id?: string | number | null;
  log_timestamp?: string | number | null;
};

export type RawLogEntry = {
  guild_info_list?: RawGuildInfo[];
  battle_log_list?: unknown[];
};

const isRawLogEntry = (value: unknown): value is RawLogEntry => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return 'guild_info_list' in v || 'battle_log_list' in v;
};

/** 문자열 안의 `{` `}` 를 무시하고 최상위 JSON 객체의 끝까지 */
function findBalancedJsonObject(text: string, start: number): { end: number; json: string } | null {
  if (text[start] !== '{') return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === '\\') escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return { end: i + 1, json: text.slice(start, i + 1) };
    }
  }
  return null;
}

function extractLogListLegacy(jsonData: unknown): RawLogEntry[] {
  if (Array.isArray(jsonData)) {
    return jsonData.filter(isRawLogEntry);
  }
  if (
    typeof jsonData === 'object' &&
    jsonData !== null &&
    'log_list' in jsonData &&
    Array.isArray((jsonData as { log_list: unknown }).log_list)
  ) {
    return (jsonData as { log_list: unknown[] }).log_list.filter(isRawLogEntry);
  }
  return isRawLogEntry(jsonData) ? [jsonData] : [];
}

function isRankingOnlyPayload(o: Record<string, unknown>): boolean {
  if (o.command === 'GetGuildSiegeRankingInfo') return true;
  if (o.guildsiege_world_ranking != null && o.log_list == null) return true;
  return false;
}

function mergeBattleLogEntries(obj: unknown, merged: RawLogEntry[]): void {
  if (obj == null || typeof obj !== 'object') return;
  const o = obj as Record<string, unknown>;

  if (isRankingOnlyPayload(o)) return;

  if (o.command === 'GetGuildSiegeBattleLog' && Array.isArray(o.log_list)) {
    for (const e of o.log_list) {
      if (isRawLogEntry(e)) merged.push(e);
    }
    return;
  }

  // 구버전: 루트에 `log_list`만 있고 command 없음
  if (Array.isArray(o.log_list) && o.log_list.length > 0) {
    const first = o.log_list[0];
    if (isRawLogEntry(first)) {
      merged.push(...(o.log_list as unknown[]).filter(isRawLogEntry));
      return;
    }
  }

  const legacy = extractLogListLegacy(obj);
  merged.push(...legacy);
}

/**
 * 파일 전체 텍스트에서 `GetGuildSiegeBattleLog`의 `log_list` 항목만 모읍니다.
 */
export function extractSiegeLogListFromFileText(text: string): RawLogEntry[] {
  const merged: RawLogEntry[] = [];
  const trimmed = text.trim();
  if (!trimmed) return [];

  // 1) 전체가 하나의 JSON
  try {
    const one = JSON.parse(trimmed) as unknown;
    if (Array.isArray(one)) {
      for (const e of one) {
        mergeBattleLogEntries(e, merged);
      }
    } else {
      mergeBattleLogEntries(one, merged);
    }
    if (merged.length > 0) return merged;
  } catch {
    /* 줄별/스캔 시도 */
  }

  // 2) NDJSON (줄마다 JSON)
  const lines = trimmed.split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('API ') || t.startsWith('Request:') || t.startsWith('Response:')) continue;
    if (!t.startsWith('{')) continue;
    try {
      mergeBattleLogEntries(JSON.parse(t), merged);
    } catch {
      /* skip */
    }
  }
  if (merged.length > 0) return merged;

  // 3) 혼합 텍스트(설명 + Response JSON) 중 BattleLog Blob
  const marker = '"command":"GetGuildSiegeBattleLog"';
  let pos = 0;
  while (pos < text.length) {
    const idx = text.indexOf(marker, pos);
    if (idx === -1) break;
    let start = idx;
    while (start > 0 && text[start] !== '{') start--;
    if (text[start] !== '{') {
      pos = idx + marker.length;
      continue;
    }
    const bal = findBalancedJsonObject(text, start);
    if (!bal) {
      pos = idx + marker.length;
      continue;
    }
    try {
      mergeBattleLogEntries(JSON.parse(bal.json), merged);
    } catch {
      /* skip */
    }
    pos = bal.end;
  }

  return merged;
}
