'use client';

import { memo } from 'react';
import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import type { RtaRatingGradeRule } from '@/features/rta/types/rta';
import { RTA_SELECT_MENU_PROPS, blurFocusedMenuItem } from '@/features/rta/rtaMenuModalProps';
import RtaTierFilterMenu from '@/features/rta/components/RtaTierFilterMenu';

/** Outlined 콤보박스(Select) — 다크 테마 서피스 배경 */
export const RTA_OUTLINED_SELECT_FIELD_SX = {
  borderRadius: 1,
  '& .MuiInputBase-root': {
    backgroundColor: 'background.paper',
  },
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'background.paper',
    '&:hover': { backgroundColor: 'action.hover' },
    '&.Mui-focused': { backgroundColor: 'background.paper' },
  },
} as const;

export const RTA_OUTLINED_SELECT_INPUT_SLOT_SX = {
  backgroundColor: 'background.paper',
  '&:hover': { backgroundColor: 'action.hover' },
  '&.Mui-focused': { backgroundColor: 'background.paper' },
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
  hideTierSelect = false,
  hideBulkTierOptions = false,
  mb = 2,
}: {
  seasonSelectValue: string;
  setSeason: (v: string) => void;
  seasonOptions: { value: string; label: string }[];
  tierSelection: string;
  setTierSelection: (v: string) => void;
  gradeRules: RtaRatingGradeRule[];
  tierRulesLoading: boolean;
  seasonLabelId?: string;
  hideTierSelect?: boolean;
  hideBulkTierOptions?: boolean;
  mb?: number;
}) {
  return (
    <Box
      className="selectbox-wrap"
      sx={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: { xs: 'nowrap', md: 'wrap' },
        alignItems: { xs: 'stretch', md: 'center' },
        gap: { xs: 1, md: 0 },
        mb,
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
          onChange={(e) => { blurFocusedMenuItem(); setSeason(String(e.target.value)); }}
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
      {!hideTierSelect && (
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
            hideBulkOptions={hideBulkTierOptions}
          />
        </Box>
      )}
    </Box>
  );
});

export { RTA_SELECT_MENU_PROPS };
export default RtaSeasonTierSelectRow;
