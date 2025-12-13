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

/**
 * 점령전 ID에서 날짜 계산
 * 점령전 ID 형식: YYYYMMWWDDXXXXXX
 * - YYYY: 년도 (4자리)
 * - MM: 월 (2자리)
 * - WW: 주차 (2자리, 해당 월의 몇 번째 주)
 * - DD: 요일 코드 (01=월요일, 02=목요일)
 * - XXXXXX: 점령전 ID (나머지)
 * 
 * @param siegeId - 점령전 ID 문자열 (예: "2025120102000016")
 * @returns 날짜 문자열 (예: "2025-12-04") 또는 빈 문자열
 */
export function parseSiegeDate(siegeId: string): string {
  if (!siegeId || siegeId.length < 10) return '';
  
  try {
    const year = parseInt(siegeId.substring(0, 4), 10);
    const month = parseInt(siegeId.substring(4, 6), 10);
    const week = parseInt(siegeId.substring(6, 8), 10);
    const dayCode = siegeId.substring(8, 10);
    
    if (isNaN(year) || isNaN(month) || isNaN(week) || month < 1 || month > 12 || week < 1 || week > 5) {
      return '';
    }
    
    // 해당 월의 첫 번째 날짜
    const firstDay = new Date(year, month - 1, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
    
    // 첫 번째 월요일 찾기
    let firstMonday = 1;
    if (firstDayOfWeek === 0) {
      // 일요일이면 다음 날이 월요일
      firstMonday = 2;
    } else if (firstDayOfWeek > 1) {
      // 화요일~토요일이면 다음 주 월요일
      firstMonday = 1 + (8 - firstDayOfWeek);
    }
    
    // 주차에 따른 월요일 날짜 계산
    const mondayDate = firstMonday + (week - 1) * 7;
    
    // 요일 코드에 따라 날짜 계산
    let targetDate: number;
    if (dayCode === '01') {
      // 월요일
      targetDate = mondayDate;
    } else if (dayCode === '02') {
      // 목요일 (월요일 + 3일)
      targetDate = mondayDate + 3;
    } else {
      // 알 수 없는 요일 코드
      return '';
    }
    
    // 날짜 유효성 검사 (해당 월의 범위를 벗어나지 않는지)
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    if (targetDate < 1 || targetDate > lastDayOfMonth) {
      return '';
    }
    
    // 날짜 포맷팅
    const date = new Date(year, month - 1, targetDate);
    return formatDate(date, 'YYYY-MM-DD');
  } catch (error) {
    console.error('점령전 ID 날짜 파싱 오류:', error);
    return '';
  }
}

/**
 * 점령전 ID에서 날짜와 요일 라벨 반환
 * @param siegeId - 점령전 ID 문자열
 * @returns 날짜와 요일 라벨 (예: "2025-12-04 (목)") 또는 빈 문자열
 */
export function formatSiegeDateLabel(siegeId: string): string {
  const date = parseSiegeDate(siegeId);
  if (!date) return '';
  
  const dayCode = siegeId.substring(8, 10);
  const dayLabel = dayCode === '01' ? '월' : dayCode === '02' ? '목' : '';
  
  return dayLabel ? `${date} (${dayLabel})` : date;
}

