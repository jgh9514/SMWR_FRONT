/**
 * 몬스터 관련 타입 정의
 */

export type AttributeType = 'fire' | 'water' | 'wind' | 'light' | 'dark';

export interface AttributeConfig {
  icons: Record<AttributeType, string>;
  labels: Record<AttributeType, string>;
  list: AttributeType[];
}

