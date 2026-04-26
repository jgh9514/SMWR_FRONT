import type { MenuProps } from '@mui/material';

/**
 * MUI `Select` / `Menu` 공통 MenuProps.
 *
 * Chrome "Blocked aria-hidden ... descendant retained focus" 완화.
 *
 * 원인: 닫힘 시 `Modal` 루트에 `aria-hidden`이 먼지어가는 찰나에 `MenuItem`이 아직 focus를 유지.
 *
 * 대응:
 * - `TransitionProps.onExiting`에서 blur (닫힘 트랜지션 시작 직전)
 * - `disableEnforceFocus` / `disableRestoreFocus`로 포커스 트랜지션과의 경합 완화
 * - `Select` `onChange` 직전 `blurFocusedMenuItem()` (각 RTA 셀렉트에서 유지)
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

export const RTA_SELECT_MENU_PROPS: Partial<MenuProps> = {
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
