/**
 * PWA/홈화면·헤더 로고·OG 이미지 교체 시 브라우저·SW 캐시를 끊기 위한 쿼리 문자열.
 * `next.config.ts`의 `env.NEXT_PUBLIC_ICON_CACHE_VERSION`이 빌드 시 주입됨.
 * 수동으로 갱신만 쓰려면 빌드 전에 `NEXT_PUBLIC_APP_ICON_VERSION`을 올리면 됨.
 */
export function getPwaIconCacheQuery(): string {
  const v = process.env.NEXT_PUBLIC_ICON_CACHE_VERSION ?? '1';
  return `?v=${encodeURIComponent(String(v))}`;
}
