/**
 * hard navigation(직접 URL·새로고침) 시 @detail 슬롯.
 * children(`siege-detail/[detail]/page.tsx`)이 전체 화면 상세를 담당하므로 중복 렌더 방지.
 */
export default function SiegeDetailParallelHardNavPlaceholder() {
  return null;
}
