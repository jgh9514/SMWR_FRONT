import MonsterDetailPage from '../../_components/MonsterDetailPage';

/**
 * `/siege/siege-detail/[detail]` 직접 접속·새로고침용 **children** 슬롯.
 * 전체 화면 상세를 렌더한다. 목록에서 클릭(soft nav)은 `@detail/(.)siege-detail` intercept + 드로어.
 */
export default function SiegeDetailFullPage() {
  return <MonsterDetailPage />;
}
