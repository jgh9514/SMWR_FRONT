/**
 * 점령전 match_id / siege_id 파서
 *
 * 16자리 고정: YYYYMMWWSSNNNNNN
 * - YYYY (1~4): 년도
 * - MM   (5~6): 월
 * - WW   (7~8): 해당 월 일요일 시작 주차 (1일이 속한 주 = 1주차)
 * - SS   (9~10): 01=월요일 점령전, 02=목요일 점령전
 * - NNNNNN (11~16): 일련번호
 *
 * 예: 2026050501000010 → 2026년 5월 5주차 월요일 점령전 #10
 */

export const SIEGE_ID_LENGTH = 16;

export type SiegeSlotCode = '01' | '02';

export type ParsedSiegeId = {
  raw: string;
  year: number;
  month: number;
  week: number;
  slot: string;
  sequence: number;
};

const SIEGE_SLOT_LABEL: Record<string, string> = {
  '01': '월',
  '02': '목',
};

/** 레거시 1대1 스페셜 (구 match_id 9~10자리) */
const LEGACY_SLOT_OFFSET_FROM_THURSDAY: Record<string, number> = {
  '03': 0,
  '04': 1,
};

/**
 * match_id 문자열에서 구조화된 필드를 추출한다.
 * 길이·숫자 형식이 맞지 않으면 null.
 */
export function parseSiegeId(siegeId: string): ParsedSiegeId | null {
  const raw = siegeId?.trim() ?? '';
  if (raw.length < SIEGE_ID_LENGTH || !/^\d+$/.test(raw)) {
    return null;
  }

  const year = parseInt(raw.substring(0, 4), 10);
  const month = parseInt(raw.substring(4, 6), 10);
  const week = parseInt(raw.substring(6, 8), 10);
  const slot = raw.substring(8, 10);
  const sequence = parseInt(raw.substring(10, 16), 10);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(week) ||
    Number.isNaN(sequence) ||
    month < 1 ||
    month > 12 ||
    week < 1 ||
    week > 6
  ) {
    return null;
  }

  return { raw, year, month, week, slot, sequence };
}

/** 일요일 시작 주차에서 slot(01=월, 02=목)에 해당하는 날짜 */
function resolveDateInSunStartWeek(
  year: number,
  month: number,
  weekNum: number,
  targetDow: number,
): Date | null {
  const lastDay = new Date(year, month, 0).getDate();
  let day = 1;
  let week = 1;

  while (day <= lastDay) {
    const startDow = new Date(year, month - 1, day).getDay();
    const endDay = Math.min(day + (6 - startDow), lastDay);

    if (week === weekNum) {
      for (let d = day; d <= endDay; d += 1) {
        if (new Date(year, month - 1, d).getDay() === targetDow) {
          return new Date(year, month - 1, d);
        }
      }
      return null;
    }

    day = endDay + 1;
    week += 1;
  }

  return null;
}

/** 구 형식: 해당 월 n번째 목요일 + 요일 오프셋 (03=목, 04=금) */
function resolveDateLegacyNthThursday(
  year: number,
  month: number,
  weekNum: number,
  dayOffsetFromThursday: number,
): Date | null {
  const lastDay = new Date(year, month, 0).getDate();
  let thursdayCount = 0;

  for (let d = 1; d <= lastDay; d += 1) {
    if (new Date(year, month - 1, d).getDay() === 4) {
      thursdayCount += 1;
      if (thursdayCount === weekNum) {
        return new Date(year, month - 1, d + dayOffsetFromThursday);
      }
    }
  }

  return null;
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * match_id에서 점령전 날짜(YYYY-MM-DD)를 계산한다.
 */
export function parseSiegeDateFromId(siegeId: string): string {
  const parts = parseSiegeId(siegeId);
  if (!parts) return '';

  const { year, month, week, slot } = parts;
  let date: Date | null = null;

  if (slot === '01') {
    date = resolveDateInSunStartWeek(year, month, week, 1);
  } else if (slot === '02') {
    date = resolveDateInSunStartWeek(year, month, week, 4);
  } else {
    const offset = LEGACY_SLOT_OFFSET_FROM_THURSDAY[slot];
    if (offset !== undefined) {
      date = resolveDateLegacyNthThursday(year, month, week, offset);
    }
  }

  return date ? formatYmd(date) : '';
}

/** slot 코드 → 요일 라벨 (01=월, 02=목) */
export function siegeSlotLabel(slot: string): string {
  return SIEGE_SLOT_LABEL[slot] ?? '';
}

/**
 * match_id → "YYYY-MM-DD (월)" 형식 라벨
 */
export function formatSiegeDateLabelFromId(siegeId: string): string {
  const date = parseSiegeDateFromId(siegeId);
  if (!date) return '';

  const parts = parseSiegeId(siegeId);
  let dayLabel = parts ? siegeSlotLabel(parts.slot) : '';

  if (!dayLabel) {
    const [y, m, d] = date.split('-').map((v) => parseInt(v, 10));
    if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
      const labels = ['일', '월', '화', '수', '목', '금', '토'];
      dayLabel = labels[new Date(y, m - 1, d).getDay()] ?? '';
    }
  }

  return dayLabel ? `${date} (${dayLabel})` : date;
}
