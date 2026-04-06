/**
 * 실레나 프록시/캡처 로그에서 RTA 리플레이 목록 응답 추출
 * (아래 키명은 게임 API JSON 필드명이며 DB 테이블명과 무관)
 * - getRankerRtpvpReplayList → ranker_replay_list
 * - getRtpvpRatingReplayList → replay_list (실제 로그 대부분이 이쪽)
 * - 줄 단위 NDJSON
 * - "API Command: …" 블록의 Response JSON (단일/여러 줄)
 */

export interface ArenaReplayItem {
  rid?: string | number;
  [key: string]: unknown;
}

/** 숫자 rid 는 항상 동일 키로 (50838 vs "50838" vs 50838.0) — 로컬 캐시·중복 제거 공통 */
export function normalizeRidKey(rid: unknown): string {
  if (rid == null || rid === '') return '';
  if (typeof rid === 'number' && Number.isFinite(rid)) {
    return String(Math.trunc(rid));
  }
  const s = String(rid).trim();
  if (s === '') return '';
  const n = Number(s);
  if (Number.isFinite(n) && /^-?\d+(\.\d+)?$/.test(s)) {
    return String(Math.trunc(n));
  }
  return s;
}

function mergeReplayArrayIntoResults(
  list: unknown,
  out: ArenaReplayItem[],
  seen: Set<string>,
): void {
  if (!Array.isArray(list)) return;
  for (const o of list) {
    if (!o || typeof o !== 'object') continue;
    const rid = (o as Record<string, unknown>).rid;
    const key = normalizeRidKey(rid);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(o as ArenaReplayItem);
  }
}

type RtaReplayResponseJson = {
  command?: string;
  ranker_replay_list?: unknown[];
  replay_list?: unknown[];
};

function mergeFromRtaReplayResponse(data: RtaReplayResponseJson, out: ArenaReplayItem[], seen: Set<string>): void {
  if (data.command === 'getRankerRtpvpReplayList' && data.ranker_replay_list !== undefined) {
    mergeReplayArrayIntoResults(data.ranker_replay_list, out, seen);
  } else if (data.command === 'getRtpvpRatingReplayList' && data.replay_list !== undefined) {
    mergeReplayArrayIntoResults(data.replay_list, out, seen);
  }
}

/**
 * 한 줄에 `{...}{...}` 형태로 JSON 이 여러 개 붙은 경우 분리 (문자열 리터럴 안의 괄호는 무시)
 */
function splitConcatenatedJsonObjects(line: string): string[] {
  const t = line.trim();
  if (!t || t[0] !== '{') return [];
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  let inString = false;
  let escape = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (c === '\\') {
        escape = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) {
        parts.push(t.slice(start, i + 1));
      }
    }
  }
  return parts;
}

function dedupeResultsByRid(items: ArenaReplayItem[]): ArenaReplayItem[] {
  const seen = new Set<string>();
  const out: ArenaReplayItem[] = [];
  for (const o of items) {
    const key = normalizeRidKey(o.rid);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(o);
  }
  return out;
}

/** 중괄호 균형으로 JSON 문자열 추출 (여러 줄 Response). 문자열 안의 { } 는 무시 */
function extractBalancedJsonFromLineIndex(lines: string[], startLine: number): { text: string; endLine: number } | null {
  let depth = 0;
  let buf = '';
  let started = false;
  let inString = false;
  let escape = false;

  const processChar = (c: string) => {
    if (inString) {
      if (escape) {
        escape = false;
      } else if (c === '\\') {
        escape = true;
      } else if (c === '"') {
        inString = false;
      }
      return;
    }
    if (c === '"') {
      inString = true;
      return;
    }
    if (c === '{') {
      depth++;
      started = true;
    } else if (c === '}') {
      depth--;
    }
  };

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    for (let p = 0; p < line.length; p++) {
      processChar(line[p]);
    }
    buf += (buf ? '\n' : '') + line;
    if (started && depth === 0) {
      const t = buf.trim();
      if (t.startsWith('{')) {
        try {
          JSON.parse(t);
          return { text: t, endLine: i };
        } catch {
          return null;
        }
      }
    }
    if (depth < 0) return null;
  }
  return null;
}

/** 랭커/레이팅 리플레이 목록 API — Response 검색 범위 끝을 잘라 내기 위해 다음 동류 Command 줄 */
function isTrackedRtaReplayApiCommandLine(line: string): boolean {
  const t = line.trim();
  if (!t.startsWith('API Command:')) return false;
  return (
    t.includes('getRankerRtpvpReplayList') ||
    t.includes('getRtpvpRatingReplayList')
  );
}

function findNextTrackedRtaReplayApiCommandLine(lines: string[], fromIndex: number): number {
  for (let x = fromIndex; x < lines.length; x++) {
    if (isTrackedRtaReplayApiCommandLine(lines[x])) {
      return x;
    }
  }
  return -1;
}

/**
 * 로그 텍스트 전체에서 ranker_replay_list + replay_list 항목을 모음 (rid 기준 1회)
 */
export function extractRankerReplayItemsFromLogText(text: string): ArenaReplayItem[] {
  const results: ArenaReplayItem[] = [];
  const seen = new Set<string>();
  const lines = text.split(/\r?\n/);

  // 1) NDJSON: 한 줄에 JSON 하나 또는 `{...}{...}` 여러 개
  for (const line of lines) {
    const t = line.trim();
    if (!t.includes('{')) continue;
    const chunks = splitConcatenatedJsonObjects(t);
    const toParse = chunks.length > 0 ? chunks : t.startsWith('{') && t.endsWith('}') ? [t] : [];
    for (const jsonStr of toParse) {
      try {
        const data = JSON.parse(jsonStr) as RtaReplayResponseJson;
        mergeFromRtaReplayResponse(data, results, seen);
      } catch {
        // ignore
      }
    }
  }

  // 2) 프록시 형식: 블록마다 API Command → Request → Response (긴 JSON은 수백 줄). 다음 동류 API Command 전까지 검색.
  let lineIdx = 0;
  while (lineIdx < lines.length) {
    if (!isTrackedRtaReplayApiCommandLine(lines[lineIdx])) {
      lineIdx++;
      continue;
    }
    const nextCmd = findNextTrackedRtaReplayApiCommandLine(lines, lineIdx + 1);
    const searchEnd = nextCmd >= 0 ? nextCmd : lines.length;

    let parsedEndLine = lineIdx;
    for (let j = lineIdx + 1; j < searchEnd; j++) {
      const L = lines[j].trim();
      if (L !== 'Response:' && !L.startsWith('Response:')) continue;

      let k = j + 1;
      while (k < lines.length && !lines[k].trim()) {
        k++;
      }
      if (k >= lines.length) break;

      const single = lines[k].trim();
      if (single.startsWith('{')) {
        try {
          const data = JSON.parse(single) as RtaReplayResponseJson;
          mergeFromRtaReplayResponse(data, results, seen);
          parsedEndLine = k;
        } catch {
          const multi = extractBalancedJsonFromLineIndex(lines, k);
          if (multi) {
            try {
              const data = JSON.parse(multi.text) as RtaReplayResponseJson;
              mergeFromRtaReplayResponse(data, results, seen);
              parsedEndLine = multi.endLine;
            } catch {
              // ignore
            }
          }
        }
      } else {
        const multi = extractBalancedJsonFromLineIndex(lines, k);
        if (multi) {
          try {
            const data = JSON.parse(multi.text) as RtaReplayResponseJson;
            mergeFromRtaReplayResponse(data, results, seen);
            parsedEndLine = multi.endLine;
          } catch {
            // ignore
          }
        }
      }
      break;
    }
    lineIdx = Math.max(lineIdx + 1, parsedEndLine + 1);
  }

  return dedupeResultsByRid(results);
}
