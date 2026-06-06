'use client';

import { Box, Container } from '@mui/material';
import HomeMainVisual from '@/features/home/components/HomeMainVisual';
import RtaDashboardClient from '@/features/rta/components/RtaDashboardClient';
export default function HomePageClient() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <HomeMainVisual />
      <Container maxWidth="xl" sx={{ pt: { xs: 2, md: 3 }, pb: { xs: 3, md: 6 } }}>
        <Box component="section" aria-label="RTA 대시보드">
          <RtaDashboardClient embedded />
        </Box>
      </Container>
    </Box>
  );
}
