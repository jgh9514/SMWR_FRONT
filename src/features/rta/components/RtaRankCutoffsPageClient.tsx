'use client';

import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import RtaRankCutoffsSection from '@/features/rta/components/RtaRankCutoffsSection';
import { useRtaDashboardRankCutoff, useRtaSeasonSelect } from '@/features/rta/hooks/useRtaData';
import { useRtaSeasonsContext } from '@/features/rta/context/RtaSeasonsContext';
import { RTA_SELECT_MENU_PROPS } from '@/features/rta/components/RtaSeasonTierSelectRow';
import { blurFocusedMenuItem } from '@/features/rta/rtaMenuModalProps';

export default function RtaRankCutoffsPageClient() {
  const { data: seasonsData } = useRtaSeasonsContext();
  const { seasonSelectValue, seasonIdForApi, setSeason, seasonOptions } = useRtaSeasonSelect(seasonsData);

  const { data, isPending, error } = useRtaDashboardRankCutoff(seasonSelectValue, seasonIdForApi);

  const searchConditions = (
    <FormControl size="small" sx={{ minWidth: 200 }}>
      <InputLabel id="rta-cutoffs-season-label">시즌</InputLabel>
      <Select
        labelId="rta-cutoffs-season-label"
        label="시즌"
        value={seasonSelectValue}
        onChange={(e) => { blurFocusedMenuItem(); setSeason(String(e.target.value)); }}
        MenuProps={RTA_SELECT_MENU_PROPS}
        sx={{
          bgcolor: '#ffffff',
          '&:hover': { bgcolor: '#ffffff' },
          '&.Mui-focused': { bgcolor: '#ffffff' },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'divider',
          },
        }}
      >
        {seasonOptions.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: { xs: '100%', md: 1100, lg: 1280, xl: 1536 },
        mx: 'auto',
        px: { xs: 2, sm: 3 },
        py: { xs: 2, md: 4 },
      }}
    >
      <PageHeader title="랭크 컷 기록" backPath="/" />
      <RtaRankCutoffsSection
        rankCutoffAnchors={data?.rank_cutoff_anchors}
        showTrendChart
        searchConditions={searchConditions}
        isLoading={isPending && !data}
        errorMessage={error ? error.message || '불러오기에 실패했습니다.' : null}
      />
    </Box>
  );
}
