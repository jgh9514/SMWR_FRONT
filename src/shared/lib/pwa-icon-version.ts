/**
 * PWA/홈화면 아이콘 교체 시 브라우저·SW 캐시를 끊기 위한 쿼리 문자열.
 * 아이콘 PNG를 바꿀 때마다 NEXT_PUBLIC_APP_ICON_VERSION만 올리면 됨 (미설정 시 빌드 식별자 사용).
 */
export function getPwaIconCacheQuery(): string {
  const v =
    process.env.NEXT_PUBLIC_APP_ICON_VERSION ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.npm_package_version ??
    '1';
  return `?v=${encodeURIComponent(String(v))}`;
}
