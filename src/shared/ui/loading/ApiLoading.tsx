'use client';

// ApiLoading(전역 API 로딩 오버레이)을 완전히 비활성화합니다.
// - 사용자 요청: 스피너/오버레이 자체가 없어야 함
// - 각 화면은 Suspense fallback/스켈레톤 UI로만 로딩 표시

export const setApiLoading = (_loading: boolean) => {
  // no-op
};

export default function ApiLoading() {
  return null;
}

