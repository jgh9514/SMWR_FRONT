'use client';

import {
  Box,
  Card,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  RTA_TIER_OFFICIAL_RULES,
  RTA_TIER_OFFICIAL_RULES_NOTE_P_TIER,
} from '@/features/rta/constants/rtaTierOfficialRules';

export default function RtaTierOfficialRulesSection() {
  return (
    <Card
      elevation={0}
      sx={{
        mt: 3,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        p: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <InfoOutlinedIcon sx={{ color: 'text.secondary', fontSize: 22 }} />
        <Typography sx={{ fontWeight: 600 }}>티어별 최소 조건 (공식 참고)</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        도전자·승부사·정복자·수호자·레전드 기준 최소 승점과 랭킹 조건입니다. 아래 수집·추정 지표와는 다를 수
        있습니다.
      </Typography>
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700 }}>티어</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>
                키
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                최소 승점
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>랭킹 조건</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {RTA_TIER_OFFICIAL_RULES.map((row) => (
              <TableRow key={row.tierKey} hover>
                <TableCell>{row.nameKo}</TableCell>
                <TableCell align="center">
                  <Typography component="span" variant="body2" fontWeight={700}>
                    {row.tierKey}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {row.minWinPoints != null ? row.minWinPoints.toLocaleString() : '—'}
                </TableCell>
                <TableCell>{row.rankRule}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        {RTA_TIER_OFFICIAL_RULES_NOTE_P_TIER}
      </Typography>
    </Card>
  );
}
