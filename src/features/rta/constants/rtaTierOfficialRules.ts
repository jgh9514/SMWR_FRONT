/**
 * RTA 공식 티어별 최소 조건 (승점·랭킹) — 참고용.
 * 수집 리플레이의 rating_id·점수와 숫자가 1:1로 대응하지 않을 수 있습니다.
 */
export interface RtaTierOfficialRuleRow {
  /** 클라이언트/서버 tier_key (Ch1, F2, Legend …) */
  tierKey: string;
  /** 한글 표기 */
  nameKo: string;
  /** 최소 승점 (없으면 null) */
  minWinPoints: number | null;
  /** 랭킹 조건 설명 */
  rankRule: string;
}

/** 도전자·승부사·정복자·수호자·레전드 (공지 기준) */
export const RTA_TIER_OFFICIAL_RULES: readonly RtaTierOfficialRuleRow[] = [
  { tierKey: 'Ch1', nameKo: '도전자1', minWinPoints: 0, rankRule: '랭킹 ~100%' },
  { tierKey: 'Ch2', nameKo: '도전자2', minWinPoints: 1000, rankRule: '랭킹 ~90%' },
  { tierKey: 'Ch3', nameKo: '도전자3', minWinPoints: 1000, rankRule: '랭킹 ~80%' },
  { tierKey: 'F1', nameKo: '승부사1', minWinPoints: 1050, rankRule: '랭킹 ~70%' },
  { tierKey: 'F2', nameKo: '승부사2', minWinPoints: 1050, rankRule: '랭킹 ~60%' },
  { tierKey: 'F3', nameKo: '승부사3', minWinPoints: 1050, rankRule: '랭킹 ~50%' },
  { tierKey: 'C1', nameKo: '정복자1', minWinPoints: 1100, rankRule: '랭킹 ~40%' },
  { tierKey: 'C2', nameKo: '정복자2', minWinPoints: 1100, rankRule: '랭킹 ~30%' },
  { tierKey: 'C3', nameKo: '정복자3', minWinPoints: 1100, rankRule: '랭킹 ~20%' },
  { tierKey: 'G1', nameKo: '수호자1', minWinPoints: 1200, rankRule: '랭킹 ~3%' },
  { tierKey: 'G2', nameKo: '수호자2', minWinPoints: 1200, rankRule: '랭킹 ~1%' },
  { tierKey: 'G3', nameKo: '수호자3', minWinPoints: 1200, rankRule: '랭킹 100위' },
  { tierKey: 'Legend', nameKo: '레전드', minWinPoints: 1200, rankRule: '랭킹 1위' },
] as const;

/**
 * 리플레이 집계에서 쓰는 P1~P3 는 위 공식 표에 별도 승점 행이 없음.
 * 게임 클라이언트 기준을 따르며 필요 시 이 배열에 추가하면 됨.
 */
export const RTA_TIER_OFFICIAL_RULES_NOTE_P_TIER =
  'P1·P2·P3(게임 내 표기) 티어의 공식 최소 승점·랭킹은 별도 공지를 참고하세요.';
