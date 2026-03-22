'use client';

import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { useSeasonList } from '@/features/battle-history/hooks/useSeasonList';
import { getSeasonNo } from '@/features/battle-history/types/battle-history';
import type { SeasonItem } from '@/features/battle-history/types/battle-history';

type Props = {
  initialSeasonList?: SeasonItem[];
  value: string;
  onChange: (value: string) => void;
};

export default function BattleHistorySeasonFilter({
  initialSeasonList = [],
  value,
  onChange,
}: Props) {
  const { data: rawList, isLoading } = useSeasonList();
  const fromClient = Array.isArray(rawList) ? rawList : [];
  const seasonList = fromClient.length > 0 ? fromClient : (Array.isArray(initialSeasonList) ? initialSeasonList : []);

  const handleChange = (e: { target: { value: string } }) => {
    onChange(e.target.value);
  };

  return (
    <FormControl size="small" sx={{ minWidth: 140 }}>
      <InputLabel id="battle-history-season-label">시즌</InputLabel>
      <Select
        labelId="battle-history-season-label"
        value={value}
        label="시즌"
        onChange={handleChange}
        disabled={isLoading}
      >
        <MenuItem value="">전체</MenuItem>
        {seasonList
          .map((s) => getSeasonNo(s as Record<string, unknown>))
          .filter((no) => no > 0)
          .map((no) => (
            <MenuItem key={no} value={String(no)}>
              {no}시즌
            </MenuItem>
          ))}
      </Select>
    </FormControl>
  );
}
