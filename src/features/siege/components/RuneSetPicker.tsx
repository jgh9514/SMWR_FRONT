'use client';

import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Avatar,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { getMonsterImageUrl } from '@/shared/utils/image';
import type { DeckMonsterRuneSelection } from '@/features/siege/types/rune';
import { useRuneMasterList } from '@/features/siege/hooks/useRuneMaster';
import { runeSelectionErrorMessage, sumRunePieces } from '@/features/siege/utils/runeValidation';
import { MUI_MENU_A11Y_PROPS } from '@/shared/ui/muiMenuA11y';

/** Dialog 안 Select — 메뉴가 모달 뒤로 가려지지 않도록 z-index 상향 */
const DIALOG_SELECT_MENU_PROPS = {
  ...MUI_MENU_A11Y_PROPS,
  sx: { zIndex: (theme: { zIndex: { modal: number } }) => theme.zIndex.modal + 2 },
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
  requiredPieces,
  imageUrl,
}: {
  nameKo: string;
  requiredPieces: number;
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
        {nameKo} ({requiredPieces}피스)
      </Box>
    </Box>
  );
}

export default function RuneSetPicker({ value, onChange, disabled = false }: RuneSetPickerProps) {
  const { data: runes = [], runeById, isLoading } = useRuneMasterList();
  const pieceSum = sumRunePieces(value, runeById);
  const errorMsg = runeSelectionErrorMessage(value, runeById);

  const handleSlotChange = (slot: typeof SLOT_KEYS[number]) => (e: SelectChangeEvent<string>) => {
    const raw = e.target.value;
    const nextId = raw === '' ? null : Number(raw);
    onChange({ ...value, [slot]: Number.isNaN(nextId) ? null : nextId });
  };

  const selectedElsewhere = (runeId: number, currentSlot: typeof SLOT_KEYS[number]) => {
    return SLOT_KEYS.some((key) => key !== currentSlot && value[key] === runeId);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        룬 세트 (최대 3종 · 합산 {pieceSum}/6)
      </Typography>
      {SLOT_KEYS.map((slotKey, idx) => (
        <FormControl key={slotKey} size="small" fullWidth disabled={disabled || isLoading}>
          <InputLabel id={`rune-slot-${idx}`}>{SLOT_LABELS[idx]}</InputLabel>
          <Select
            labelId={`rune-slot-${idx}`}
            label={SLOT_LABELS[idx]}
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
              return (
                <RuneOptionLabel
                  nameKo={rune.name_ko}
                  requiredPieces={rune.required_pieces}
                  imageUrl={rune.image_url}
                />
              );
            }}
          >
            <MenuItem value="">
              <em>선택 안 함</em>
            </MenuItem>
            {runes.length === 0 && !isLoading ? (
              <MenuItem value="__empty__" disabled>
                룬 목록을 불러오지 못했습니다
              </MenuItem>
            ) : null}
            {runes.map((rune) => {
              const id = Number(rune.rune_id);
              if (!Number.isFinite(id) || id <= 0) return null;
              const taken = selectedElsewhere(id, slotKey);
              return (
                <MenuItem key={id} value={String(id)} disabled={taken}>
                  <RuneOptionLabel
                    nameKo={rune.name_ko}
                    requiredPieces={rune.required_pieces}
                    imageUrl={rune.image_url}
                  />
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      ))}
      {errorMsg && (
        <Typography variant="caption" color="error">
          {errorMsg}
        </Typography>
      )}
    </Box>
  );
}
