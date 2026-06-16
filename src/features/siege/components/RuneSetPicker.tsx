'use client';

import { useCallback, useEffect, useState } from 'react';
import { Avatar, Box, Button, CircularProgress, Menu, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { getMonsterImageUrl } from '@/shared/utils/image';
import type { DeckMonsterRuneSelection } from '@/features/siege/types/rune';
import { useRuneMasterList } from '@/features/siege/hooks/useRuneMaster';
import { runeSelectionErrorMessage } from '@/features/siege/utils/runeValidation';
import { MUI_MENU_A11Y_PROPS, blurFocusedMenuItem } from '@/shared/ui/muiMenuA11y';

/** Dialog(zIndex modal+20) 위에 Menu가 보이도록 — paper만이 아니라 Popover root z-index도 올림 */
const DIALOG_MENU_Z_INDEX = (theme: Theme) => theme.zIndex.modal + 50;

const DIALOG_MENU_SLOT_PROPS = {
  ...MUI_MENU_A11Y_PROPS,
  sx: { zIndex: DIALOG_MENU_Z_INDEX },
  slotProps: {
    ...MUI_MENU_A11Y_PROPS.slotProps,
    root: {
      ...(MUI_MENU_A11Y_PROPS.slotProps?.root ?? {}),
      sx: { zIndex: DIALOG_MENU_Z_INDEX },
    },
    paper: {
      sx: {
        zIndex: DIALOG_MENU_Z_INDEX,
        maxWidth: 'min(100vw - 24px, 440px)',
        width: '100%',
      },
    },
  },
};

const RUNE_GRID_COLS = 4;

interface RuneSetPickerProps {
  value: DeckMonsterRuneSelection;
  onChange: (next: DeckMonsterRuneSelection) => void;
  disabled?: boolean;
}

const SLOT_KEYS = ['runeId1', 'runeId2', 'runeId3'] as const;
const SLOT_LABELS = ['룬 1', '룬 2', '룬 3'];

const RUNE_SLOT_BOX_SX = {
  width: { xs: 68, sm: 76 },
  height: { xs: 68, sm: 76 },
  borderRadius: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
} as const;

const RUNE_ICON_SX = {
  width: { xs: 52, sm: 58 },
  height: { xs: 52, sm: 58 },
  bgcolor: 'background.paper',
  borderRadius: 1.5,
  '& img': { objectFit: 'contain' },
} as const;

export default function RuneSetPicker({ value, onChange, disabled = false }: RuneSetPickerProps) {
  const { data: runes = [], runeById, isLoading } = useRuneMasterList();
  const errorMsg = runeSelectionErrorMessage(value, runeById);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [activeSlot, setActiveSlot] = useState<(typeof SLOT_KEYS)[number] | null>(null);
  const menuOpen = Boolean(anchorEl && activeSlot);

  const getRunePieces = (runeId: number | null | undefined): number => {
    if (!runeId) return 0;
    const rune = runeById.get(runeId);
    return Number(rune?.required_pieces ?? 0);
  };

  const firstTwoPieces = getRunePieces(value.runeId1) + getRunePieces(value.runeId2);
  const isThirdSlotLocked = value.runeId1 != null && value.runeId2 != null && firstTwoPieces >= 6;

  useEffect(() => {
    if (isThirdSlotLocked && value.runeId3 != null) {
      onChange({ ...value, runeId3: null });
    }
  }, [isThirdSlotLocked, onChange, value]);

  const handleMenuClose = useCallback(() => {
    blurFocusedMenuItem();
    setAnchorEl(null);
    setActiveSlot(null);
  }, []);

  const handleSlotClick = useCallback(
    (slot: (typeof SLOT_KEYS)[number], target: HTMLElement) => {
      if (disabled || (slot === 'runeId3' && isThirdSlotLocked)) return;
      setActiveSlot(slot);
      setAnchorEl(target);
    },
    [disabled, isThirdSlotLocked],
  );

  const handleSelect = useCallback(
    (runeId: number | null) => {
      if (!activeSlot) return;
      blurFocusedMenuItem();
      onChange({ ...value, [activeSlot]: runeId });
      setAnchorEl(null);
      setActiveSlot(null);
    },
    [activeSlot, onChange, value],
  );

  const runeOptions = runes.filter((rune) => {
    const id = Number(rune.rune_id);
    return Number.isFinite(id) && id > 0;
  });

  const activeSelectedId = activeSlot ? value[activeSlot] : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        룬 세트 (슬롯 클릭)
      </Typography>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: { xs: 1.25, sm: 2 },
          flexWrap: 'nowrap',
          overflowX: 'auto',
          px: 0.75,
          py: 1,
          borderRadius: 1.5,
          bgcolor: (t) => alpha(t.palette.action.hover, 0.25),
        }}
      >
        {SLOT_KEYS.map((slotKey, index) => {
          const runeId = value[slotKey];
          const rune = runeId != null ? runeById.get(runeId) : undefined;
          const slotDisabled = disabled || (slotKey === 'runeId3' && isThirdSlotLocked);
          const isActive = menuOpen && activeSlot === slotKey;

          return (
            <Box
              key={slotKey}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.75,
                flexShrink: 0,
                minWidth: { xs: 72, sm: 80 },
              }}
            >
              <Box
                role="button"
                tabIndex={slotDisabled ? -1 : 0}
                aria-label={`${SLOT_LABELS[index]} ${rune ? rune.name_ko : '선택'}`}
                aria-disabled={slotDisabled}
                onClick={(event) => {
                  event.stopPropagation();
                  handleSlotClick(slotKey, event.currentTarget);
                }}
                onKeyDown={(event) => {
                  if (slotDisabled) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSlotClick(slotKey, event.currentTarget);
                  }
                }}
                sx={{
                  cursor: slotDisabled ? 'not-allowed' : 'pointer',
                  opacity: slotDisabled ? 0.45 : 1,
                  outline: 'none',
                  '&:focus-visible > div': {
                    boxShadow: (t) => `0 0 0 2px ${alpha(t.palette.primary.main, 0.45)}`,
                  },
                }}
              >
                {rune ? (
                  <Box
                    sx={{
                      ...RUNE_SLOT_BOX_SX,
                      border: '2px solid',
                      borderColor: isActive ? 'primary.main' : 'divider',
                      bgcolor: 'background.paper',
                      boxShadow: isActive ? (t) => `0 0 0 2px ${alpha(t.palette.primary.main, 0.2)}` : 'none',
                    }}
                  >
                    <Avatar
                      src={rune.image_url ? getMonsterImageUrl(rune.image_url) : undefined}
                      alt={rune.name_ko}
                      variant="rounded"
                      sx={RUNE_ICON_SX}
                    />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      ...RUNE_SLOT_BOX_SX,
                      bgcolor: 'action.hover',
                      border: '2px dashed',
                      borderColor: isActive ? 'primary.main' : 'divider',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                      +
                    </Typography>
                  </Box>
                )}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 500,
                  textAlign: 'center',
                  maxWidth: 80,
                  lineHeight: 1.2,
                }}
                noWrap
              >
                {rune?.name_ko ?? SLOT_LABELS[index]}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        disableAutoFocus
        {...DIALOG_MENU_SLOT_PROPS}
      >
        <Box sx={{ px: 1.5, pb: 1.5, pt: 0.5, width: 'min(100vw - 24px, 440px)' }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <>
              <Box sx={{ mb: 0.75 }}>
                <Button
                  fullWidth
                  size="small"
                  variant={activeSelectedId == null ? 'contained' : 'outlined'}
                  onClick={() => handleSelect(null)}
                >
                  선택 안 함
                </Button>
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${RUNE_GRID_COLS}, minmax(0, 1fr))`,
                  gap: 0.75,
                }}
              >
                {runeOptions.length === 0 ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 1 }}
                  >
                    선택 가능한 룬이 없습니다.
                  </Typography>
                ) : (
                  runeOptions.map((rune) => {
                    const id = Number(rune.rune_id);
                    if (!Number.isFinite(id) || id <= 0) return null;
                    const selected = activeSelectedId === id;

                    return (
                      <Button
                        key={id}
                        size="small"
                        variant={selected ? 'contained' : 'outlined'}
                        onClick={() => handleSelect(id)}
                        sx={{
                          minHeight: 56,
                          flexDirection: 'column',
                          gap: 0.25,
                          py: 0.75,
                          px: 0.5,
                          fontSize: '0.65rem',
                          lineHeight: 1.2,
                        }}
                      >
                        <Avatar
                          src={rune.image_url ? getMonsterImageUrl(rune.image_url) : undefined}
                          alt={rune.name_ko}
                          variant="rounded"
                          sx={{ width: 28, height: 28, '& img': { objectFit: 'contain' } }}
                        />
                        <Box component="span" sx={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {rune.name_ko}
                        </Box>
                      </Button>
                    );
                  })
                )}
              </Box>
            </>
          )}
        </Box>
      </Menu>

      {errorMsg && (
        <Typography variant="caption" color="error">
          {errorMsg}
        </Typography>
      )}
    </Box>
  );
}
