'use client';

/**
 * `/siege/siege-detail/[detail]` 에 대한 **children** 슬롯 전용 페이지.
 * 병렬 라우트(@detail)만 있을 때 새로고침하면 default.tsx만 매칻되어 라우팅/params가 불안정해질 수 있어,
 * 동일 URL에 명시적 세그먼트를 둡니다.
 */
import SiegePage from '../../page';

export default function SiegeDetailListShellPage() {
  return <SiegePage />;
}
