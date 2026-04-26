'use client';

import { memo } from 'react';
import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import type { RtaRatingGradeRule } from '@/features/rta/types/rta';
import { RTA_SELECT_MENU_PROPS } from '@/features/rta/rtaMenuModalProps';
import RtaTierFilterMenu from '@/features/rta/components/RtaTierFilterMenu';

/** Outlined 콤보박스(Select) — 필드·입력 루트 모두 흰 배경 (MUI7는 slot + sx 병행이 안정적) */
export const RTA_OUTLINED_SELECT_FIELD_SX = {
  backgroundColor: 'common.white',
  borderRadius: 1,
  '& .MuiInputBase-root': {
    backgroundColor: 'common.white',
    bgcolor: 'common.white',
  },
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'common.white',
    bgcolor: 'common.white',
    '&:hover': { backgroundColor: 'common.white', bgcolor: 'common.white' },
    '&.Mui-focused': { backgroundColor: 'common.white', bgcolor: 'common.white' },
  },
} as const;

export const RTA_OUTLINED_SELECT_INPUT_SLOT_SX = {
  backgroundColor: 'common.white',
  bgcolor: 'common.white',
  '&:hover': { backgroundColor: 'common.white', bgcolor: 'common.white' },
  '&.Mui-focused': { backgroundColor: 'common.white', bgcolor: 'common.white' },
} as const;

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
        flexDirection: 'row',
        flexWrap: { xs: 'nowrap', md: 'wrap' },
        alignItems: { xs: 'stretch', md: 'center' },
        /** md 미만: 시즌·티어 5:5 (flex 동일), md+: 기존 고정폭 */
        gap: { xs: 1, md: 0 },
        mb: 2,
      }}
    >
      <FormControl
        size="small"
        sx={{
          minWidth: 0,
          flex: { xs: '1 1 0%', md: '0 0 180px' },
          width: { md: 180 },
        }}
      >
        <InputLabel id={seasonLabelId}>시즌</InputLabel>
        <Select
          labelId={seasonLabelId}
          label="시즌"
          value={seasonSelectValue}
          onChange={(e) => setSeason(String(e.target.value))}
          sx={RTA_OUTLINED_SELECT_FIELD_SX}
          slotProps={{ input: { sx: RTA_OUTLINED_SELECT_INPUT_SLOT_SX } }}
          MenuProps={RTA_SELECT_MENU_PROPS}
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
          minWidth: 0,
          flex: { xs: '1 1 0%', md: '0 0 180px' },
          width: { md: 180 },
          ml: { xs: 0, md: 1 },
          '& .MuiButton-root': {
            minWidth: { xs: 0, md: 180 },
            width: { xs: '100%', md: 180 },
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

export { RTA_SELECT_MENU_PROPS };
export default RtaSeasonTierSelectRow;
