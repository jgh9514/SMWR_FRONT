'use client';

import { Box, Container } from '@mui/material';
import RtaDashboardClient from '@/features/rta/components/RtaDashboardClient';
import { RtaSeasonsProvider } from '@/features/rta/context/RtaSeasonsContext';

export default function HomePageClient() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="xl" sx={{ pt: { xs: 2, md: 3 }, pb: { xs: 3, md: 6 } }}>
        <Box component="section" aria-label="RTA 티어 분포 및 랭크 컷">
          <RtaSeasonsProvider>
            <RtaDashboardClient embedded />
          </RtaSeasonsProvider>
        </Box>
      </Container>
    </Box>
  );
}
