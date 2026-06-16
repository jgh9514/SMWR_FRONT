'use client';

import {
  Autocomplete,
  Chip,
  Box,
  Typography,
  Avatar,
  TextField,
} from '@mui/material';
import { getMonsterImageUrl } from '@/shared/utils/image';
import type { DeckMonsterRuneSelection } from '@/features/siege/types/rune';
import { useRuneMasterList } from '@/features/siege/hooks/useRuneMaster';
import { runeSelectionErrorMessage } from '@/features/siege/utils/runeValidation';
import { MUI_MENU_A11Y_PROPS } from '@/shared/ui/muiMenuA11y';

const DIALOG_AUTOCOMPLETE_POPPER_SLOT = {
  sx: { zIndex: (theme: { zIndex: { modal: number } }) => theme.zIndex.modal + 40 },
};

interface RuneSetPickerProps {
  value: DeckMonsterRuneSelection;
  onChange: (next: DeckMonsterRuneSelection) => void;
  disabled?: boolean;
}

const SLOT_KEYS = ['runeId1', 'runeId2', 'runeId3'] as const;

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
  const selectedRuneIds = SLOT_KEYS
    .map((slot) => value[slot])
    .filter((id): id is number => id != null && Number.isFinite(id));
  const selectedRunes = selectedRuneIds
    .map((id) => runeById.get(id))
    .filter((rune): rune is NonNullable<typeof runes[number]> => !!rune);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        룬 세트 (최대 3종)
      </Typography>
      <Autocomplete
        multiple
        options={runes}
        disabled={disabled || isLoading}
        value={selectedRunes}
        disableCloseOnSelect
        filterSelectedOptions
        isOptionEqualToValue={(option, selected) => option.rune_id === selected.rune_id}
        getOptionLabel={(option) => option.name_ko}
        onChange={(_, next) => {
          const limited = next.slice(0, 3);
          const ids = limited.map((rune) => Number(rune.rune_id)).filter((id) => Number.isFinite(id) && id > 0);
          onChange({
            runeId1: ids[0] ?? null,
            runeId2: ids[1] ?? null,
            runeId3: ids[2] ?? null,
          });
        }}
        slotProps={{
          popper: DIALOG_AUTOCOMPLETE_POPPER_SLOT,
          paper: MUI_MENU_A11Y_PROPS.slotProps?.paper,
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            placeholder={selectedRunes.length >= 3 ? '최대 3개 선택됨' : '룬 세트 검색 후 선택'}
          />
        )}
        renderOption={(props, option) => (
          <Box component="li" {...props}>
            <RuneOptionLabel
              nameKo={option.name_ko}
              imageUrl={option.image_url}
            />
          </Box>
        )}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option.rune_id}
              size="small"
              label={option.name_ko}
              avatar={
                <Avatar
                  src={option.image_url ? getMonsterImageUrl(option.image_url) : undefined}
                  sx={{ '& img': { objectFit: 'contain' } }}
                />
              }
            />
          ))
        }
      />
      {errorMsg && (
        <Typography variant="caption" color="error">
          {errorMsg}
        </Typography>
      )}
    </Box>
  );
}
