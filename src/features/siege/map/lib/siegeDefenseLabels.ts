/** MatchupInfo base_status */
export function formatSiegeBaseStatus(status: number | null | undefined): string {
  switch (status) {
    case 0:
      return '정상';
    case 1:
      return '공성 중';
    case 2:
      return '파괴';
    default:
      return status != null ? `거점 ${status}` : '—';
  }
}

/** BaseDefense deck status (게임 코드 — 수집 스냅 기준) */
export function formatSiegeDeckStatus(status: number | null | undefined): string {
  switch (status) {
    case 0:
      return '대기';
    case 1:
      return '전투 중';
    case 2:
      return '패배';
    case 3:
      return '쿨다운';
    default:
      return status != null ? `상태 ${status}` : '—';
  }
}

export function siegeDeckStatusColor(status: number): 'default' | 'warning' | 'error' | 'success' | 'info' {
  switch (status) {
    case 1:
      return 'warning';
    case 2:
      return 'error';
    case 3:
      return 'info';
    default:
      return 'default';
  }
}
