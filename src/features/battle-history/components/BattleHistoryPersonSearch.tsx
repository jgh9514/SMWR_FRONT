'use client';

import { TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function BattleHistoryPersonSearch({ value, onChange }: Props) {
  return (
    <TextField
      size="small"
      label="소환사"
      placeholder="이름 검색..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{ minWidth: 200 }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
      }}
    />
  );
}
