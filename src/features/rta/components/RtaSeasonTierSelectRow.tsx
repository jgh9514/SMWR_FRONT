'use client';

import { memo } from 'react';
import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import type { RtaRatingGradeRule } from '@/features/rta/types/rta';
import RtaTierFilterMenu from '@/features/rta/components/RtaTierFilterMenu';

/** 시즌·티어 필터 (몬스터 통계·상세 개요 등 공통) */
const RtaSeasonTierSelectRow = memo(function RtaSeasonTierSelectRow({
  seasonSelectValue,
  setSeason,
  seasonOptions,
  tierSelection,
  setTierSelection,
  gradeRules,
  tierRulesLoading,
  seasonLabelId = 'rta-season-tier-season-label',
}: {
  seasonSelectValue: string;
  setSeason: (v: string) => void;
  seasonOptions: { value: string; label: string }[];
  tierSelection: string;
  setTierSelection: (v: string) => void;
  gradeRules: RtaRatingGradeRule[];
  tierRulesLoading: boolean;
  seasonLabelId?: string;
}) {
  return (
    <Box
      className="selectbox-wrap"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: { xs: 1.5, sm: 0 },
        mb: 2,
      }}
    >
      <FormControl
        size="small"
        sx={{
          minWidth: { xs: '100%', sm: 180 },
          width: { xs: '100%', sm: 180 },
          flexShrink: 0,
        }}
      >
        <InputLabel id={seasonLabelId}>시즌</InputLabel>
        <Select
          labelId={seasonLabelId}
          label="시즌"
          value={seasonSelectValue}
          onChange={(e) => setSeason(String(e.target.value))}
        >
          {seasonOptions.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Box
        sx={{
          minWidth: { xs: '100%', sm: 180 },
          width: { xs: '100%', sm: 180 },
          flexShrink: 0,
          ml: { xs: 0, sm: 1 },
          '& .MuiButton-root': {
            minWidth: { xs: '100%', sm: 180 },
            width: { xs: '100%', sm: 180 },
          },
        }}
      >
        <RtaTierFilterMenu
          value={tierSelection}
          onChange={setTierSelection}
          rules={gradeRules}
          disabled={tierRulesLoading}
        />
      </Box>
    </Box>
  );
});

export default RtaSeasonTierSelectRow;
