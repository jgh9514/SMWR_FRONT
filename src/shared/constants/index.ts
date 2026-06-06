/**
 * 프로젝트 전역 상수
 */

// 페이지네이션
export const DEFAULT_ITEMS_PER_PAGE = 12;
export const DEFAULT_PAGE_SIZE = 5;
export const DEFAULT_PAGE_OFFSET = 1;

// 시간 관련 (ms)
export const ANIMATION_DURATION_MS = 300;
export const TOAST_DURATION_MS = 3000;
export const SCROLL_THROTTLE_MS = 150;

// API 관련
export const API_TIMEOUT_MS = 30000;
/** 실레나 rta-upload: 전투당 다건 INSERT로 청크당 수십 초 걸릴 수 있음 (30초 기본 타임아웃으로 조용히 끊김 방지) */
export const RTA_UPLOAD_TIMEOUT_MS = 180000;
/** 수동 배치 동기 실행 — 완료까지 HTTP 연결 유지 (기본 2시간, WAS smw.batch.manual-run.wait-timeout-ms 와 맞춤) */
export const BATCH_MANUAL_RUN_TIMEOUT_MS = 7_200_000;
export const QUERY_STALE_TIME_MS = 5 * 60 * 1000; // 5분
export const QUERY_GC_TIME_MS = 10 * 60 * 1000; // 10분

// 레이아웃
export const MOBILE_BREAKPOINT = 'md';

// 이미지 크기
export const AVATAR_SIZE_XS = 50;
export const AVATAR_SIZE_MD = 60;
export const AVATAR_SIZE_LG = 80;

// 페이지네이션 옵션
export const PAGINATION_OPTIONS = [
  { cd: 5, cd_nm: '5개씩 보기' },
  { cd: 10, cd_nm: '10개씩 보기' },
  { cd: 20, cd_nm: '20개씩 보기' },
  { cd: 50, cd_nm: '50개씩 보기' },
] as const;

// RTA 레이팅 기준 (Vue와 동일)
export const RATING_THRESHOLD_4000 = 4000;
export const RATING_THRESHOLD_3000 = 3000;
export const RATING_THRESHOLD_2000 = 2000;

// RTA 레이팅 색상 (Vue와 동일)
export const RATING_COLOR_4000 = '#ff3e00'; // 4000 이상
export const RATING_COLOR_3000 = '#00baad'; // 3000 이상
export const RATING_COLOR_2000 = '#ffc300'; // 2000 이상
export const RATING_COLOR_DEFAULT = '#999'; // 그 외

// 하위 호환성을 위한 기존 상수 (deprecated)
export const RATING_THRESHOLD_5_STARS = 2000;
export const RATING_THRESHOLD_4_STARS = 1800;
export const RATING_THRESHOLD_3_STARS = 1600;
export const RATING_THRESHOLD_2_STARS = 1400;
export const RATING_COLOR_GOLD = '#ffd700';
export const RATING_COLOR_SILVER = '#c0c0c0';
export const RATING_COLOR_BRONZE = '#cd7f32';

