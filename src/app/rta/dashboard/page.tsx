import { permanentRedirect } from 'next/navigation';

/** 예전 URL(/rta/dashboard) 대비 — RTA 티어·랭크 컷은 메인(/)에 통합됨 */
export default function RtaDashboardRedirectPage() {
  permanentRedirect('/');
}
