/**
 * RTA 티어별 최소 조건 (승점·랭킹) — 코드/주석 참고용. 화면에는 노출하지 않음.
 * 수집 리플레이의 rating_id·점수와 숫자가 1:1로 대응하지 않을 수 있습니다.
 */
export interface RtaTierOfficialRuleRow {
  /** 클라이언트/서버 tier_key */
  tierKey: string;
  /** 한글 표기 */
  nameKo: string;
  /** 최소 승점 (없으면 null) */
  minWinPoints: number | null;
  /** 랭킹 조건 설명 */
  rankRule: string;
}

/** 도전자·승부사·정복자·심판자·수호자·레전드 (참고, rating_id 구간과 병기) */
export const RTA_TIER_OFFICIAL_RULES: readonly RtaTierOfficialRuleRow[] = [
  { tierKey: 'Ch1', nameKo: '도전자1 (1000번대)', minWinPoints: 0, rankRule: '랭킹 ~100%' },
  { tierKey: 'Ch2', nameKo: '도전자2', minWinPoints: 1000, rankRule: '랭킹 ~90%' },
  { tierKey: 'Ch3', nameKo: '도전자3', minWinPoints: 1000, rankRule: '랭킹 ~80%' },
  { tierKey: 'F1', nameKo: '승부사1 (2000번대)', minWinPoints: 1050, rankRule: '랭킹 ~70%' },
  { tierKey: 'F2', nameKo: '승부사2', minWinPoints: 1050, rankRule: '랭킹 ~60%' },
  { tierKey: 'F3', nameKo: '승부사3', minWinPoints: 1050, rankRule: '랭킹 ~50%' },
  { tierKey: 'C1', nameKo: '정복자1 (3000번대)', minWinPoints: 1100, rankRule: '랭킹 ~40%' },
  { tierKey: 'C2', nameKo: '정복자2', minWinPoints: 1100, rankRule: '랭킹 ~30%' },
  { tierKey: 'C3', nameKo: '정복자3', minWinPoints: 1100, rankRule: '랭킹 ~20%' },
  { tierKey: 'P1', nameKo: '심판자1 (3500번대)', minWinPoints: 1150, rankRule: '랭킹 ~15%' },
  { tierKey: 'P2', nameKo: '심판자2', minWinPoints: 1150, rankRule: '랭킹 ~10%' },
  { tierKey: 'P3', nameKo: '심판자3', minWinPoints: 1150, rankRule: '랭킹 ~6%' },
  { tierKey: 'G1', nameKo: '수호자1 (4000번대)', minWinPoints: 1200, rankRule: '랭킹 ~3%' },
  { tierKey: 'G2', nameKo: '수호자2', minWinPoints: 1200, rankRule: '랭킹 ~1%' },
  { tierKey: 'G3', nameKo: '수호자3', minWinPoints: 1200, rankRule: '랭킹 100위' },
  { tierKey: 'L1', nameKo: '레전드1 (5000번대)', minWinPoints: 1200, rankRule: '랭킹 상위' },
  { tierKey: 'L2', nameKo: '레전드2', minWinPoints: 1200, rankRule: '랭킹 상위' },
  { tierKey: 'L3', nameKo: '레전드3', minWinPoints: 1200, rankRule: '랭킹 1위' },
] as const;
