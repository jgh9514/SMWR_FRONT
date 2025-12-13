/**
 * 애플리케이션 테마 상수
 * MUI 테마는 AppProviders에서 정의됨
 */

export const colors = {
  primary: '#0064FF',
  secondary: '#4E5968',
  background: '#FFFFFF',
  surface: '#F2F4F6',
  text: '#191F28',
} as const;

export type AppColors = typeof colors;
