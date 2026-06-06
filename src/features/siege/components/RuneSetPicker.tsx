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

interface RuneSetPickerProps {
  value: DeckMonsterRuneSelection;
  onChange: (next: DeckMonsterRuneSelection) => void;
  disabled?: boolean;
}

const SLOT_KEYS = ['runeId1', 'runeId2', 'runeId3'] as const;
const SLOT_LABELS = ['룬 세트 1', '룬 세트 2', '룬 세트 3'];

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
          >
            <MenuItem value="">
              <em>선택 안 함</em>
            </MenuItem>
            {runes.map((rune) => {
              const id = Number(rune.rune_id);
              const taken = selectedElsewhere(id, slotKey);
              return (
                <MenuItem key={id} value={String(id)} disabled={taken}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {rune.image_url ? (
                      <Avatar
                        src={getMonsterImageUrl(rune.image_url)}
                        alt={rune.name_ko}
                        variant="rounded"
                        sx={{ width: 24, height: 24 }}
                      />
                    ) : null}
                    <span>
                      {rune.name_ko} ({rune.required_pieces}피스)
                    </span>
                  </Box>
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
