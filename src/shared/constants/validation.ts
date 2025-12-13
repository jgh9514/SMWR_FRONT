/**
 * 검증 관련 상수
 */

// 입력값 최대 길이
export const MAX_COMMENT_LENGTH = 1000;
export const MAX_TITLE_LENGTH = 200;

// 페이지네이션 기본값
export const DEFAULT_PAGE_SIZE = 10;

// Rate Limiting
export const RATE_LIMIT_MAX_REQUESTS = 10;
export const RATE_LIMIT_WINDOW_MS = 60000; // 1분

// 파일 크기 제한 (바이트)
export const MAX_FILE_SIZE_JSON = 10 * 1024 * 1024; // 10MB
export const MAX_FILE_SIZE_IMAGE = 5 * 1024 * 1024; // 5MB

// 시간 관련 상수 (밀리초)
export const COOKIE_CHECK_RETRY_DELAY_MS = 100;
export const COOKIE_CHECK_MAX_RETRIES = 10;

// 시간 변환 상수 (밀리초)
export const MS_PER_MINUTE = 60000;
export const MS_PER_HOUR = 3600000;
export const MS_PER_DAY = 86400000;

