/**
 * 타임스탬프(ISO)·날짜 문자열 → Asia/Seoul 달력 YYYY-MM-DD.
 * UTC ISO만 앞 10자 자르면 KST와 하루 어긋날 수 있어 서버·DB 기준과 맞춘다.
 */
export function toYmdKst(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}
