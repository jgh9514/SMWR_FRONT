/**
 * 포맷팅 유틸리티
 */

/**
 * 숫자를 천 단위로 포맷팅
 * @param value - 포맷팅할 숫자
 * @returns 포맷팅된 문자열 (예: "1,234")
 */
export function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num.toLocaleString('ko-KR');
}

/**
 * 퍼센트 포맷팅
 * @param value - 퍼센트 값
 * @param decimals - 소수점 자릿수 (기본: 1)
 * @returns 포맷팅된 문자열 (예: "50.5%")
 */
export function formatPercent(value: number | string, decimals: number = 1): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0%';
  return `${num.toFixed(decimals)}%`;
}

/**
 * 날짜 포맷팅
 * @param date - 날짜 문자열 또는 Date 객체
 * @param format - 포맷 형식 (기본: 'YYYY-MM-DD')
 * @returns 포맷팅된 날짜 문자열
 */
export function formatDate(date: string | Date, format: string = 'YYYY-MM-DD'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 파일 크기 포맷팅
 * @param bytes - 바이트 수
 * @returns 포맷팅된 문자열 (예: "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/** 해당 월의 n번째 목요일 기준 일 수 오프셋 (목=0) */
const SIEGE_DAY_CODE_OFFSET_FROM_THURSDAY: Record<string, number> = {
  '01': -3, // 월 — 일반(레토 길드 1차 등)
  '02': -2, // 화 — 1대1 스페셜매치
  '03': 0, // 목 — 일반 목요일 (match_id 9~10번이 03인 경우)
  '04': 1, // 금 — 1대1 스페셜매치
};

/**
 * 점령전 ID에서 날짜 계산
 * 형식: YYYYMMWWDDXXXXXX
 * - YYYY: 년도 (4자리)
 * - MM: 월 (2자리)
 * - WW: 주차 (2자리, 해당 월의 n번째 목요일이 속한 주)
 * - DD: 요일 코드 — 01=월, 02=화(1대1 스페셜), 03=목(일반), 04=금(1대1 스페셜)
 * - XXXXXX: 나머지
 *
 * 구 match_id가 02=목이던 데이터는 03=목으로 바뀌는 전제가 있으면 그에 맞고,
 * 여전히 02=목만 쓰는 ID는 날짜가 어긋날 수 있음(서버 규칙과 동기화 필요).
 *
 * @param siegeId - 점령전 ID 문자열 (예: "2025120102000016")
 * @returns 날짜 문자열 (예: "2025-12-04") 또는 빈 문자열
 */
export function parseSiegeDate(siegeId: string): string {
  if (!siegeId || siegeId.length < 10) return '';

  const dayCode = siegeId.substring(8, 10);
  const dayOffsetFromThursday = SIEGE_DAY_CODE_OFFSET_FROM_THURSDAY[dayCode];
  if (dayOffsetFromThursday === undefined) return '';

  try {
    const year = parseInt(siegeId.substring(0, 4), 10);
    const month = parseInt(siegeId.substring(4, 6), 10);
    const week = parseInt(siegeId.substring(6, 8), 10);

    if (isNaN(year) || isNaN(month) || isNaN(week) || month < 1 || month > 12 || week < 1 || week > 6) {
      return '';
    }

    const lastDayOfMonth = new Date(year, month, 0).getDate();

    let nthThursdayDate: number | null = null;
    let thursdayCount = 0;
    for (let d = 1; d <= lastDayOfMonth; d += 1) {
      const dow = new Date(year, month - 1, d).getDay(); // 0=일 ... 4=목
      if (dow === 4) {
        thursdayCount += 1;
        if (thursdayCount === week) {
          nthThursdayDate = d;
          break;
        }
      }
    }

    if (nthThursdayDate == null) return '';

    const date = new Date(year, month - 1, nthThursdayDate + dayOffsetFromThursday);

    return formatDate(date, 'YYYY-MM-DD');
  } catch {
    return '';
  }
}

/**
 * 점령전 ID에서 날짜와 요일 라벨 반환
 * @param siegeId - 점령전 ID 문자열
 * @returns 날짜와 요일 라벨 (예: "2025-12-04 (목)") 또는 빈 문자열
 */
const SIEGE_DAY_CODE_LABEL: Record<string, string> = {
  '01': '월',
  '02': '화',
  '03': '목',
  '04': '금',
};

/**
 * ISO 날짜 문자열 → "N일 전 / N시간 전 / 방금" 한국어 상대 표현
 */
export function formatRelativeKo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days < 0) return '방금';
  if (days === 0) {
    const hours = Math.floor(diffMs / 3600000);
    return hours <= 0 ? '방금' : `${hours}시간 전`;
  }
  return days === 1 ? '1일 전' : `${days}일 전`;
}

export function formatSiegeDateLabel(siegeId: string): string {
  const date = parseSiegeDate(siegeId);
  if (!date) return '';

  const dayCode = siegeId.substring(8, 10);
  let dayLabel = SIEGE_DAY_CODE_LABEL[dayCode] ?? '';

  if (!dayLabel) {
    const parts = date.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
        const dow = new Date(y, m - 1, d).getDay();
        const labels = ['일', '월', '화', '수', '목', '금', '토'];
        dayLabel = labels[dow] ?? '';
      }
    }
  }

  return dayLabel ? `${date} (${dayLabel})` : date;
}

