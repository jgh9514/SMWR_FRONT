'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Avatar, Box, Card, Chip, Collapse, IconButton, Typography, useMediaQuery, useTheme } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RtaRatingStarIcons from '@/features/rta/components/RtaRatingStarIcons';
import RtaUnitPickGrid from '@/features/rta/components/RtaUnitPickGrid';
import { getSwexPlayerImageUrl } from '@/shared/utils/image';
import type { MatchItem } from '@/types';

function rtaSideBgWin(theme: Theme) {
  const d = theme.palette.mode === 'dark';
  return d
    ? `linear-gradient(160deg, ${alpha('#34d399', 0.28)} 0%, ${alpha('#059669', 0.42)} 55%, ${alpha('#064e3b', 0.55)} 100%)`
    : `linear-gradient(160deg, ${alpha('#ecfdf5', 1)} 0%, ${alpha('#6ee7b7', 0.35)} 50%, ${alpha('#a7f3d0', 0.55)} 100%)`;
}

function rtaSideBgLose(theme: Theme) {
  const d = theme.palette.mode === 'dark';
  return d
    ? `linear-gradient(160deg, ${alpha('#475569', 0.4)} 0%, ${alpha('#7f1d1d', 0.22)} 100%)`
    : `linear-gradient(160deg, ${alpha('#f8fafc', 1)} 0%, ${alpha('#fecdd3', 0.42)} 70%, ${alpha('#fda4af', 0.28)} 100%)`;
}

const RTA_BADGE_WIN = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
const RTA_BADGE_LOSE = 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)';

export default function RtaMatchListCard({ match }: { match: MatchItem }) {
  const theme = useTheme();
  const rtaStarSize = useMediaQuery(theme.breakpoints.up('md')) ? 12 : 10;
  const [isExpanded, setIsExpanded] = useState(true);

  const p1Wins = match.winnerPosition === '1';
  const expLeftUnits = match.p1Units ?? [];
  const expRightUnits = match.p2Units ?? [];
  const expLeftFirstPick = match.p1FirstPick === '1';
  const expRightFirstPick = match.p2FirstPick === '1';

  return (
    <Card
      elevation={0}
      sx={(t) => ({
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: alpha(t.palette.divider, 0.14),
        boxShadow: t.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.25)' : '0 12px 40px rgba(15,23,42,0.07)',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: t.palette.mode === 'dark' ? '0 12px 48px rgba(0,0,0,0.35)' : '0 16px 48px rgba(15,23,42,0.1)',
        },
      })}
    >
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', minHeight: 64 }}>
        {/* 왼쪽 — 승자 */}
        <Box
          sx={(t) => ({
            flex: 1,
            background: p1Wins ? rtaSideBgWin(t) : rtaSideBgLose(t),
            px: { xs: 1.5, md: 2 },
            py: { xs: 1.5, md: 2 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 0.5,
            minWidth: 0,
            overflow: 'hidden',
          })}
        >
          <Chip
            size="small"
            label={p1Wins ? 'WIN' : 'LOSE'}
            sx={{
              height: 22,
              fontSize: '0.7rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              color: '#fff',
              background: p1Wins ? RTA_BADGE_WIN : RTA_BADGE_LOSE,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              '& .MuiChip-label': { px: 1 },
            }}
          />
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, gap: { xs: 0.5, md: 1.25 }, width: '100%', overflow: 'hidden' }}>
            <Avatar
              component={Link}
              href={`/rta/player/${encodeURIComponent(match.p1Id)}`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              src={getSwexPlayerImageUrl(match.p1ChannelUid || match.p1Id)}
              sx={{ width: { xs: 40, md: 52 }, height: { xs: 40, md: 52 }, flexShrink: 0, boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                {match.p1Country && (
                  <Box component="img" src={`https://flagcdn.com/w40/${match.p1Country.toLowerCase()}.png`} alt={match.p1Country} sx={{ width: { xs: 14, md: 18 }, height: { xs: 10, md: 13 }, flexShrink: 0 }} />
                )}
                <Typography
                  component={Link}
                  href={`/rta/player/${encodeURIComponent(match.p1Id)}`}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  variant="body2"
                  fontWeight={700}
                  sx={{ fontSize: { xs: '0.75rem', md: '0.9rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none', color: 'inherit', '&:hover': { textDecoration: 'underline' } }}
                >
                  {match.p1Name || 'Player'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <RtaRatingStarIcons rating={match.p1Rating} size={rtaStarSize} />
                {match.p1Score > 0 && (
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' }, fontWeight: 600 }}>
                    {match.p1Score}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* 가운데 — VS + 날짜 + 접기 */}
        <Box
          sx={(t) => ({
            flexShrink: 0,
            width: { xs: 56, sm: 72, md: 92 },
            py: 0,
            px: { xs: 0.25, md: 0.5 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.75,
            borderLeft: `1px solid ${alpha(t.palette.divider, 0.18)}`,
            borderRight: `1px solid ${alpha(t.palette.divider, 0.18)}`,
            background: alpha(t.palette.background.paper, 0.25),
          })}
        >
          <Typography variant="overline" sx={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.18em', color: 'text.secondary', lineHeight: 1 }}>
            VS
          </Typography>
          {match.date && (() => {
            try {
              const d = new Date(match.date);
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              const hours = String(d.getHours()).padStart(2, '0');
              const minutes = String(d.getMinutes()).padStart(2, '0');
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                  <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.75rem' }, fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {`${year}-${month}-${day}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.55rem', sm: '0.6rem', md: '0.7rem' }, textAlign: 'center' }}>
                    {`${hours}:${minutes}`}
                  </Typography>
                </Box>
              );
            } catch {
              return <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', textAlign: 'center' }}>{match.date}</Typography>;
            }
          })()}
          <IconButton size="small" onClick={() => setIsExpanded((v) => !v)} aria-expanded={isExpanded} sx={{ p: '2px' }}>
            <ExpandMoreIcon sx={(t) => ({ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s', color: t.palette.text.secondary, fontSize: { xs: 22, md: 26 } })} />
          </IconButton>
        </Box>

        {/* 오른쪽 — 패자 */}
        <Box
          sx={(t) => ({
            flex: 1,
            background: !p1Wins ? rtaSideBgWin(t) : rtaSideBgLose(t),
            px: { xs: 1.5, md: 2 },
            py: { xs: 1.5, md: 2 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 0.5,
            minWidth: 0,
            overflow: 'hidden',
          })}
        >
          <Chip
            size="small"
            label={!p1Wins ? 'WIN' : 'LOSE'}
            sx={{
              height: 22,
              fontSize: '0.7rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              color: '#fff',
              background: !p1Wins ? RTA_BADGE_WIN : RTA_BADGE_LOSE,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              '& .MuiChip-label': { px: 1 },
            }}
          />
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row-reverse' }, alignItems: { md: 'center' }, gap: { xs: 0.5, md: 1.25 }, width: '100%', overflow: 'hidden' }}>
            <Avatar
              component={Link}
              href={`/rta/player/${encodeURIComponent(match.p2Id)}`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              src={getSwexPlayerImageUrl(match.p2ChannelUid || match.p2Id)}
              sx={{ width: { xs: 40, md: 52 }, height: { xs: 40, md: 52 }, flexShrink: 0, alignSelf: { xs: 'flex-end', md: 'auto' }, boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0, alignItems: 'flex-end' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, overflow: 'hidden' }}>
                <Typography
                  component={Link}
                  href={`/rta/player/${encodeURIComponent(match.p2Id)}`}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  variant="body2"
                  fontWeight={700}
                  sx={{ fontSize: { xs: '0.75rem', md: '0.9rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right', textDecoration: 'none', color: 'inherit', '&:hover': { textDecoration: 'underline' } }}
                >
                  {match.p2Name || 'Opponent'}
                </Typography>
                {match.p2Country && (
                  <Box component="img" src={`https://flagcdn.com/w40/${match.p2Country.toLowerCase()}.png`} alt={match.p2Country} sx={{ width: { xs: 14, md: 18 }, height: { xs: 10, md: 13 }, flexShrink: 0 }} />
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {match.p2Score > 0 && (
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' }, fontWeight: 600 }}>
                    {match.p2Score}
                  </Typography>
                )}
                <RtaRatingStarIcons rating={match.p2Rating} size={rtaStarSize} />
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* 펼치기 — 픽/밴 유닛 */}
      <Collapse in={isExpanded}>
        <Box
          sx={(t) => ({
            mt: 0,
            pt: 2,
            pb: 1.5,
            px: { xs: 1.5, sm: 2 },
            borderTop: `1px solid ${alpha(t.palette.divider, 0.2)}`,
            background: t.palette.mode === 'dark' ? alpha(t.palette.background.default, 0.35) : alpha(t.palette.grey[50], 0.85),
          })}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: { xs: 0.5, md: 1 } }}>
            <Box>
              <Box sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: '100%', background: p1Wins ? RTA_BADGE_WIN : RTA_BADGE_LOSE, clipPath: 'polygon(0% 0%, 80% 0%, 100% 100%, 0% 100%)', px: { xs: 1, md: 1.5 }, py: { xs: 0.35, md: 0.45 }, boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}>
                  <Typography sx={{ color: '#fff', fontSize: { xs: '0.65rem', md: '0.72rem' }, fontWeight: 800, letterSpacing: '0.08em', lineHeight: 1, textShadow: '0 1px 2px rgba(0,0,0,0.35)', textAlign: 'left' }}>
                    {p1Wins ? 'WIN' : 'LOSE'}
                  </Typography>
                </Box>
              </Box>
              <RtaUnitPickGrid units={expLeftUnits} isFirstPickInDraft={expLeftFirstPick} rowAlign="start" />
            </Box>
            <Typography variant="overline" sx={{ alignSelf: 'center', fontSize: { xs: '0.7rem', md: '0.75rem' }, fontWeight: 800, letterSpacing: '0.2em', color: 'text.secondary', px: { xs: 0.5, md: 1 } }}>
              VS
            </Typography>
            <Box>
              <Box sx={{ mb: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                <Box sx={{ width: '100%', background: !p1Wins ? RTA_BADGE_WIN : RTA_BADGE_LOSE, clipPath: 'polygon(20% 0%, 100% 0%, 100% 100%, 0% 100%)', px: { xs: 1, md: 1.5 }, py: { xs: 0.35, md: 0.45 }, boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}>
                  <Typography sx={{ color: '#fff', fontSize: { xs: '0.65rem', md: '0.72rem' }, fontWeight: 800, letterSpacing: '0.08em', lineHeight: 1, textShadow: '0 1px 2px rgba(0,0,0,0.35)', textAlign: 'right' }}>
                    {!p1Wins ? 'WIN' : 'LOSE'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ width: 'fit-content', ml: 'auto' }}>
                <RtaUnitPickGrid units={expRightUnits} isFirstPickInDraft={expRightFirstPick} rowAlign="end" />
              </Box>
            </Box>
          </Box>
        </Box>
      </Collapse>
    </Card>
  );
}
