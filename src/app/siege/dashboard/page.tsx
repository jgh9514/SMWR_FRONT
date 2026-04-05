import { permanentRedirect } from 'next/navigation';

/** 예전 URL(/siege/dashboard) 대비 — 점령전 메뉴는 메인(/) Siege 섹션으로 통합 */
export default function SiegeDashboardRedirectPage() {
  permanentRedirect('/');
}
