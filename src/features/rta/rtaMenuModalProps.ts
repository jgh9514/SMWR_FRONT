import type { MenuProps } from '@mui/material';

/**
 * MUI `Select` / `Menu` 공통 MenuProps.
 *
 * "Blocked aria-hidden ... descendant retained focus" 수정.
 *
 * 원인: open=false → Modal이 aria-hidden 즉시 적용 → exit 트랜지션 진행 중에 MenuItem이
 *       포커스 유지. onExit/onExiting 은 aria-hidden 적용 이후에 호출되므로 효과 없음.
 *
 * 수정: MenuProps 자체에 onClose 를 두지 않고, 호출 측(Select onChange, Menu onClose)에서
 *       상태 변경 직전에 blur 를 호출해야 한다. ← 각 컴포넌트에서 blurFocusedMenuItem() 호출.
 *       여기서는 closeAfterTransition 으로 DOM 정리 타이밍만 보강한다.
 */
export function blurFocusedMenuItem() {
  if (typeof document === 'undefined') return;
  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    active.blur();
  }
}

export const RTA_SELECT_MENU_PROPS: Partial<MenuProps> = {
  disableScrollLock: true,
  closeAfterTransition: true,
  slotProps: {
    root: {
      closeAfterTransition: true,
    },
  },
};
