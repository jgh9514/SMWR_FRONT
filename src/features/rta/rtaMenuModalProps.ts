import type { MenuProps } from '@mui/material';

/**
 * MUI `Select` / `Menu` 공통: "Blocked aria-hidden ... descendant retained focus" 완화.
 * - `closeAfterTransition`: exit 후 Modal 정리
 * - `slotProps.root`: MUI7에서 루트(Modal)에 닫힘 타이밍이 빠지지 않도록 보강
 * - `disableScrollLock`: 본문 스크롤 락·스택 이슈 완화
 */
export const RTA_SELECT_MENU_PROPS: Partial<MenuProps> = {
  disableScrollLock: true,
  closeAfterTransition: true,
  slotProps: {
    root: {
      closeAfterTransition: true,
    },
  },
};
