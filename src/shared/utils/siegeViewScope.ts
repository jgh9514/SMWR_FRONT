export type SiegeViewScope = 'A' | 'C';

export const SIEGE_VIEW_SCOPE_CHANGED_EVENT = 'smwr:siege-view-scope-changed';

export function normalizeSiegeViewScope(raw: unknown): SiegeViewScope {
  const s = raw != null ? String(raw).trim().toUpperCase() : '';
  return s === 'A' ? 'A' : 'C';
}

/** localStorage userInfo 기준 점령전 조회 범위 (기본 C: 최근 시즌) */
export function readSiegeViewScopeFromUserInfo(): SiegeViewScope {
  if (typeof window === 'undefined') return 'C';
  try {
    const raw = window.localStorage.getItem('userInfo');
    if (!raw) return 'C';
    const parsed = JSON.parse(raw) as { siege_view_scope?: unknown };
    return normalizeSiegeViewScope(parsed?.siege_view_scope);
  } catch {
    return 'C';
  }
}

export function getSiegeViewScopeParamsForApi(): { siege_view_scope: SiegeViewScope } {
  return { siege_view_scope: readSiegeViewScopeFromUserInfo() };
}

export function notifySiegeViewScopeChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SIEGE_VIEW_SCOPE_CHANGED_EVENT));
}
