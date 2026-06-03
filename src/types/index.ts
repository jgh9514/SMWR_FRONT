/**
 * 타입 정의 통합 export
 * 
 * 주의: 타입들은 각 feature 내부로 이동되었습니다.
 * 이 파일은 하위 호환성을 위해 유지되며, 새로운 코드에서는
 * 각 feature의 types를 직접 import하는 것을 권장합니다.
 */

export type {
  GuildItem,
  MonsterItem,
  MonsterItem as SiegeMonsterItem,
  SiegeSearchParams,
  GuildInfo,
  MonsterStats,
  Monster,
  DeckMonsterStats,
} from '@/features/siege/types/siege';
export * from '@/features/siege/types/siegeDetail';
export type {
  SiegeItem,
  SiegeListResponse,
  SiegeListParams,
} from '@/features/siege/types/recent-siege';
export * from '@/features/rta/types/rta';
export * from '@/features/battle-history/types/battle-history';
export * from '@/features/auth/types/auth';
export * from '@/features/log-upload/types/log-upload';

// Admin types - UserItem 충돌 해결을 위해 명시적 export
export type {
  UserItem as AdminUserItem,
  LoginHisItem,
  RoleItem,
  ApiHisItem,
  ApiHistoryResponse,
  ApiHistoryQueryParams,
  UserRoleItem,
  SaveRequest,
  MlangItem,
  DashboardStats,
  DailyStats,
  DashboardStatsResponse,
} from '@/features/admin/types/admin';

// Battle history types - UserItem 충돌 해결을 위해 명시적 export
export type {
  UserItem as BattleHistoryUserItem,
  BattleItem,
  BattleGroup,
  RecordListParams,
  RecordDetailParams,
  SeasonItem,
} from '@/features/battle-history/types/battle-history';
