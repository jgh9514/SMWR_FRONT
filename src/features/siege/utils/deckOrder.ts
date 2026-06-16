/** targeting_order / turn_order 저장 형식 파싱 (예: "12345 > 67890 > 11111") */
export function parseMonsterOrderString(raw: string | null | undefined, fallbackIds: string[]): string[] {
  const parsed = raw
    ? raw
        .split('>')
        .map((part) => part.trim())
        .filter(Boolean)
    : [];

  if (
    parsed.length === fallbackIds.length &&
    parsed.length > 0 &&
    parsed.every((id) => fallbackIds.includes(id))
  ) {
    return parsed;
  }

  return fallbackIds;
}

export function buildMonsterOrderString(ids: string[]): string {
  return ids.join(' > ');
}

/** 조합 목록 변경 시 기존 턴/타겟 순서를 최대한 유지하고 신규 몬스터만 뒤에 붙임 */
export function mergeMonsterOrderIds(previous: string[], compositionIds: string[]): string[] {
  if (compositionIds.length === 0) {
    return [];
  }
  if (previous.length === 0) {
    return compositionIds;
  }

  const kept = previous.filter((id) => compositionIds.includes(id));
  const added = compositionIds.filter((id) => !kept.includes(id));
  const merged = [...kept, ...added];
  return merged.length === compositionIds.length ? merged : compositionIds;
}
