'use client';

import Link from 'next/link';
import { Avatar, Box, Card, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import RtaRatingStarIcons from '@/features/rta/components/RtaRatingStarIcons';
import RtaUnitPickGrid from '@/features/rta/components/RtaUnitPickGrid';
import { getMatchPerspective } from '@/features/rta/utils/rtaPlayerPerspective';
import { getSwexPlayerImageUrl } from '@/shared/utils/image';
import type { MatchItem } from '@/types';

function parseMatchDate(iso: string): Date {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

function formatMatchDateOnly(iso: string): string {
  const d = parseMatchDate(iso);
  if (d.getTime() === 0) return '—';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatMatchTimeOnly(iso: string): string {
  const d = parseMatchDate(iso);
  if (d.getTime() === 0) return '';
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function formatMatchWhen(
  iso: string,
): { type: 'relative'; text: string } | { type: 'absolute'; date: string; time: string } {
  const d = parseMatchDate(iso);
  if (d.getTime() === 0) return { type: 'absolute', date: '—', time: '' };
  const diff = Date.now() - d.getTime();
  if (diff < 0 || diff >= THIRTY_DAYS_MS)
    return { type: 'absolute', date: formatMatchDateOnly(iso), time: formatMatchTimeOnly(iso) };
  const minute = Math.floor(diff / 60000);
  const hour = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (minute < 1) return { type: 'relative', text: '방금 전' };
  if (minute < 60) return { type: 'relative', text: `${minute}분 전` };
  if (hour < 24) return { type: 'relative', text: `${hour}시간 전` };
  return { type: 'relative', text: `${day}일 전` };
}

export function RtaMatchCard({
  match,
  wizardId,
}: {
  match: MatchItem;
  wizardId: string;
}) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const starSize = isMdUp ? 16 : 10;

  const p = getMatchPerspective(match, wizardId);
  if (!p) return null;

  const { won } = p;
  const iAmP1 = String(p.myId) === String(match.p1Id);
  const myFirstPick = (iAmP1 ? match.p1FirstPick : match.p2FirstPick) === '1';
  const oppFirstPick = (iAmP1 ? match.p2FirstPick : match.p1FirstPick) === '1';
  const myHref = `/rta/player/${encodeURIComponent(p.myId)}`;
  const oppHref = `/rta/player/${encodeURIComponent(p.oppId)}`;
  const when = formatMatchWhen(match.date);

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: won ? 'success.main' : 'error.main',
        background: (t) =>
          won
            ? `linear-gradient(${t.palette.success.main}12, ${t.palette.success.main}08)`
            : `linear-gradient(${t.palette.error.main}12, ${t.palette.error.main}08)`,
        borderWidth: 1,
      }}
    >
      <Stack direction={{ xs: 'column', lg: 'row' }} sx={{ p: { xs: 1.5, sm: 2 }, gap: { xs: 1.5, sm: 2 } }}>
        {/* 결과 + 시각 */}
        <Stack
          sx={{
            minWidth: { lg: 100 },
            width: { xs: '100%', lg: 'auto' },
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: { lg: 1 },
            borderBottom: { xs: 1, lg: 0 },
            borderColor: 'divider',
            pr: { lg: 2 },
            pb: { xs: 1.5, lg: 0 },
            flexShrink: 0,
          }}
        >
          <Typography fontWeight={900} color={won ? 'success.main' : 'error.main'}>
            {won ? '승리' : '패배'}
          </Typography>
          {when.type === 'relative' ? (
            <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ lineHeight: 1.35 }}>
              {when.text}
            </Typography>
          ) : (
            <>
              <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ lineHeight: 1.35 }}>
                {when.date}
              </Typography>
              {when.time ? (
                <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ lineHeight: 1.35, fontSize: 11 }}>
                  {when.time}
                </Typography>
              ) : null}
            </>
          )}
        </Stack>

        <Stack flex={1} spacing={1.5} minWidth={0}>
          {/* 플레이어 정보 */}
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', width: '100%', gap: { xs: 0.75, md: 1.5 } }}>
            {/* 나 */}
            <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, gap: { xs: 0.5, md: 1.25 } }}>
              <Avatar component={Link} href={myHref} onClick={(e: React.MouseEvent) => e.stopPropagation()} src={getSwexPlayerImageUrl(p.myChannelUid ?? p.myId)} sx={{ width: { xs: 40, md: 44 }, height: { xs: 40, md: 44 }, flexShrink: 0 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
                <Typography component={Link} href={myHref} onClick={(e: React.MouseEvent) => e.stopPropagation()} variant="body2" fontWeight={700} noWrap title={p.myName}
                  sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', textDecoration: 'none', color: 'inherit', '&:hover': { textDecoration: 'underline' } }}>
                  {p.myName}
                </Typography>
                <Stack direction="row" alignItems="center" gap={0.5} flexWrap="wrap">
                  {p.myRating > 0 ? <RtaRatingStarIcons rating={p.myRating} size={starSize} gap={0.5} /> : <Typography variant="caption" color="text.disabled">—</Typography>}
                  <Typography variant="body2" fontWeight={700} component="span" sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' } }}>
                    {Math.round(p.myScore).toLocaleString()}
                  </Typography>
                </Stack>
              </Box>
            </Box>

            {/* 상대 */}
            <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: { xs: 'column', md: 'row-reverse' }, alignItems: { xs: 'flex-end', md: 'center' }, gap: { xs: 0.5, md: 1.25 } }}>
              <Avatar component={Link} href={oppHref} onClick={(e: React.MouseEvent) => e.stopPropagation()} src={getSwexPlayerImageUrl(p.oppChannelUid ?? p.oppId)} sx={{ width: { xs: 40, md: 44 }, height: { xs: 40, md: 44 }, flexShrink: 0, alignSelf: { xs: 'flex-end', md: 'auto' } }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0, alignItems: 'flex-end' }}>
                <Typography component={Link} href={oppHref} onClick={(e: React.MouseEvent) => e.stopPropagation()} variant="body2" fontWeight={700} noWrap title={p.oppName}
                  sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', textDecoration: 'none', color: 'inherit', '&:hover': { textDecoration: 'underline' } }}>
                  {p.oppName}
                </Typography>
                <Stack direction="row" alignItems="center" justifyContent="flex-end" gap={0.5} flexWrap="wrap">
                  <Typography variant="body2" fontWeight={700} component="span" sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' } }}>
                    {Math.round(p.oppScore).toLocaleString()}
                  </Typography>
                  {p.oppRating > 0 ? <RtaRatingStarIcons rating={p.oppRating} size={starSize} gap={0.5} /> : <Typography variant="caption" color="text.disabled">—</Typography>}
                </Stack>
              </Box>
            </Box>
          </Box>

          {/* 픽/밴 그리드 */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', alignItems: 'center', columnGap: { xs: 0.5, sm: 1 }, width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', minWidth: 0 }}>
              <RtaUnitPickGrid units={p.myUnits} isFirstPickInDraft={myFirstPick} rowAlign="start" />
            </Box>
            <Typography variant="h6" sx={{ fontSize: { xs: '0.875rem', md: '1rem' }, fontWeight: 700, color: 'primary.main', px: { xs: 0.25, sm: 0.5 }, lineHeight: 1, justifySelf: 'center', textAlign: 'center' }}>
              VS
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
              <RtaUnitPickGrid units={p.oppUnits} isFirstPickInDraft={oppFirstPick} rowAlign="end" />
            </Box>
          </Box>
        </Stack>
      </Stack>
    </Card>
  );
}
