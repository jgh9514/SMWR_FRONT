export function formatRemainMmSs(remainSec: number | null | undefined): string | null {
  if (remainSec == null || remainSec <= 0) {
    return null;
  }
  const m = Math.floor(remainSec / 60);
  const s = remainSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatCapturedAt(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function shieldProgressPercent(baseStatus: number, remainSec: number | null | undefined): number {
  if (baseStatus === 0) {
    return 100;
  }
  if (baseStatus === 2) {
    return 0;
  }
  if (remainSec != null && remainSec > 0) {
    return 8;
  }
  if (baseStatus === 1) {
    return 55;
  }
  return 80;
}
