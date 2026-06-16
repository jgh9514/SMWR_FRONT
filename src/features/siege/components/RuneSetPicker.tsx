'use client';

import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Box,
  Typography,
  Avatar,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { useEffect } from 'react';
import { getMonsterImageUrl } from '@/shared/utils/image';
import type { DeckMonsterRuneSelection } from '@/features/siege/types/rune';
import { useRuneMasterList } from '@/features/siege/hooks/useRuneMaster';
import { runeSelectionErrorMessage } from '@/features/siege/utils/runeValidation';
import { MUI_MENU_A11Y_PROPS } from '@/shared/ui/muiMenuA11y';

/** Dialog 안 Select — 메뉴가 모달 뒤로 가려지지 않도록 z-index 상향 */
const DIALOG_SELECT_MENU_PROPS = {
  ...MUI_MENU_A11Y_PROPS,
  sx: { zIndex: (theme: { zIndex: { modal: number } }) => theme.zIndex.modal + 40 },
  slotProps: {
    ...(MUI_MENU_A11Y_PROPS.slotProps ?? {}),
    paper: {
      sx: { zIndex: (theme: { zIndex: { modal: number } }) => theme.zIndex.modal + 40 },
    },
  },
};

interface RuneSetPickerProps {
  value: DeckMonsterRuneSelection;
  onChange: (next: DeckMonsterRuneSelection) => void;
  disabled?: boolean;
}

const SLOT_KEYS = ['runeId1', 'runeId2', 'runeId3'] as const;
const SLOT_LABELS = ['룬 세트 1', '룬 세트 2', '룬 세트 3'];

const RUNE_ICON_SX = {
  width: 28,
  height: 28,
  flexShrink: 0,
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  '& img': { objectFit: 'contain' },
} as const;

function RuneOptionLabel({
  nameKo,
  imageUrl,
}: {
  nameKo: string;
  imageUrl?: string | null;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
      <Avatar
        src={imageUrl ? getMonsterImageUrl(imageUrl) : undefined}
        alt={nameKo}
        variant="rounded"
        sx={RUNE_ICON_SX}
      />
      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {nameKo}
      </Box>
    </Box>
  );
}

export default function RuneSetPicker({ value, onChange, disabled = false }: RuneSetPickerProps) {
  const { data: runes = [], runeById, isLoading } = useRuneMasterList();
  const errorMsg = runeSelectionErrorMessage(value, runeById);

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

  const handleSlotChange = (slot: typeof SLOT_KEYS[number]) => (e: SelectChangeEvent<string>) => {
    const raw = e.target.value;
    const nextId = raw === '' ? null : Number(raw);
    if (Number.isNaN(nextId)) return;
    onChange({ ...value, [slot]: nextId });
  };

  const optionsForSlot = (slot: typeof SLOT_KEYS[number]) => {
    const otherSelectedIds = SLOT_KEYS
      .filter((key) => key !== slot)
      .map((key) => value[key])
      .filter((id): id is number => id != null && Number.isFinite(id));

    return runes.filter((rune) => {
      const id = Number(rune.rune_id);
      if (!Number.isFinite(id) || id <= 0) return false;
      const isCurrentSelected = value[slot] === id;
      if (isCurrentSelected) return true;
      return !otherSelectedIds.includes(id);
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        룬 세트 (최대 3종)
      </Typography>
      {SLOT_KEYS.map((slotKey, index) => (
        <FormControl
          key={slotKey}
          size="small"
          fullWidth
          disabled={disabled || isLoading || (slotKey === 'runeId3' && isThirdSlotLocked)}
        >
          <InputLabel id={`rune-slot-${index}`}>{SLOT_LABELS[index]}</InputLabel>
          <Select
            labelId={`rune-slot-${index}`}
            label={SLOT_LABELS[index]}
            value={value[slotKey] != null ? String(value[slotKey]) : ''}
            onChange={handleSlotChange(slotKey)}
            MenuProps={DIALOG_SELECT_MENU_PROPS}
            displayEmpty
            renderValue={(selected) => {
              if (!selected) {
                return <em>선택 안 함</em>;
              }
              const rune = runeById.get(Number(selected));
              if (!rune) {
                return String(selected);
              }
              return <RuneOptionLabel nameKo={rune.name_ko} imageUrl={rune.image_url} />;
            }}
          >
            <MenuItem value="">
              <em>선택 안 함</em>
            </MenuItem>
            {optionsForSlot(slotKey).map((rune) => {
              const id = Number(rune.rune_id);
              if (!Number.isFinite(id) || id <= 0) return null;
              return (
                <MenuItem key={id} value={String(id)}>
                  <RuneOptionLabel nameKo={rune.name_ko} imageUrl={rune.image_url} />
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      ))}
      {isThirdSlotLocked && (
        <Typography variant="caption" color="text.secondary">
          룬 세트 1+2 합이 6피스라서 3번 슬롯은 비활성화됩니다.
        </Typography>
      )}
      {errorMsg && (
        <Typography variant="caption" color="error">
          {errorMsg}
        </Typography>
      )}
    </Box>
  );
}
