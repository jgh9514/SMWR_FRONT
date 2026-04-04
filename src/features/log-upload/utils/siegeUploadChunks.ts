/** 한 번에 보낼 점령전 매치(log_list 원소) 개수 — 요청 타임아웃·페이로드 완화 */
export const SIEGE_LOG_CHUNK_SIZE = 40;

export function chunkArray<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/** 전역 log_list 인덱스 → 청크 내 인덱스로 siegeOptions 키 변환 */
export function remapSiegeOptionsForChunk(
  siegeOptions: Record<string, 'skip' | 'overwrite'> | undefined,
  baseIndex: number,
  chunkLength: number,
): Record<string, 'skip' | 'overwrite'> {
  const out: Record<string, 'skip' | 'overwrite'> = {};
  if (!siegeOptions) return out;
  for (const [k, v] of Object.entries(siegeOptions)) {
    const gi = parseInt(k, 10);
    if (Number.isFinite(gi) && gi >= baseIndex && gi < baseIndex + chunkLength) {
      out[String(gi - baseIndex)] = v;
    }
  }
  return out;
}
