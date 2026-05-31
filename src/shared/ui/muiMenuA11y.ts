import type { MenuProps } from '@mui/material';

/**
 * MUI Menu / Select 드롭다운 공통 a11y 설정.
 *
 * 닫힘 시 Modal 루트에 aria-hidden 이 걸리는 순간 MenuItem 이 focus 를 유지하면
 * Chrome 이 "Blocked aria-hidden on an element because its descendant retained focus" 를 냄.
 */
export function blurFocusedMenuItem() {
  if (typeof document === 'undefined') return;
  const run = () => {
    const el = document.activeElement;
    if (el instanceof HTMLElement) {
      el.blur();
    }
  };
  run();
  queueMicrotask(run);
}

export const MUI_MENU_A11Y_PROPS: Partial<MenuProps> = {
  disableScrollLock: true,
  closeAfterTransition: true,
  disableEnforceFocus: true,
  disableRestoreFocus: true,
  TransitionProps: {
    onExiting: () => {
      blurFocusedMenuItem();
    },
  },
  slotProps: {
    root: {
      closeAfterTransition: true,
    },
  },
};
