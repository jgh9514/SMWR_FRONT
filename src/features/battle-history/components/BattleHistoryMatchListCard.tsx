'use client';

import { useState } from 'react';
import { Box, Card, Chip, Collapse, IconButton, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BattleHistoryMonsterCell from '@/features/battle-history/components/BattleHistoryMonsterCell';
import { formatDate, formatSiegeDateLabel } from '@/shared/utils/format';
import type { BattleItem } from '@/features/battle-history/types/battle-history';

function sideBgWin(theme: Theme) {
  const d = theme.palette.mode === 'dark';
  return d
    ? `linear-gradient(160deg, ${alpha('#34d399', 0.28)} 0%, ${alpha('#059669', 0.42)} 55%, ${alpha('#064e3b', 0.55)} 100%)`
    : `linear-gradient(160deg, ${alpha('#ecfdf5', 1)} 0%, ${alpha('#6ee7b7', 0.35)} 50%, ${alpha('#a7f3d0', 0.55)} 100%)`;
}

function sideBgLose(theme: Theme) {
  const d = theme.palette.mode === 'dark';
  return d
    ? `linear-gradient(160deg, ${alpha('#475569', 0.4)} 0%, ${alpha('#7f1d1d', 0.22)} 100%)`
    : `linear-gradient(160deg, ${alpha('#f8fafc', 1)} 0%, ${alpha('#fecdd3', 0.42)} 70%, ${alpha('#fda4af', 0.28)} 100%)`;
}

const BADGE_WIN = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
const BADGE_LOSE = 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)';

function formatBattleDate(battle: BattleItem): { date: string; time: string } | null {
  if (battle.log_timestamp) {
    const d = new Date(battle.log_timestamp);
    if (!Number.isNaN(d.getTime())) {
      return {
        date: formatDate(d, 'YYYY-MM-DD'),
        time: formatDate(d, 'HH:mm'),
      };
    }
  }
  const siegeLabel = formatSiegeDateLabel(battle.match_id);
  if (siegeLabel) {
    return { date: siegeLabel, time: '' };
  }
  return null;
}

type Props = {
  battle: BattleItem;
};

export default function BattleHistoryMatchListCard({ battle }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isWin = battle.win_lose === '1';
  const dateParts = formatBattleDate(battle);
  const attackUrls = [battle.attack_monster_1, battle.attack_monster_2, battle.attack_monster_3];
  const defenseUrls = [battle.defense_monster_1, battle.defense_monster_2, battle.defense_monster_3];

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
        <Box
          sx={(t) => ({
            flex: 1,
            background: isWin ? sideBgWin(t) : sideBgLose(t),
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
            label={isWin ? '승' : '패'}
            sx={{
              height: 22,
              fontSize: '0.7rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              color: '#fff',
              background: isWin ? BADGE_WIN : BADGE_LOSE,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              '& .MuiChip-label': { px: 1 },
            }}
          />
          <Box sx={{ minWidth: 0, width: '100%' }}>
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{ fontSize: { xs: '0.75rem', md: '0.9rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {battle.guild_name || '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {battle.wizard_name || '—'}
            </Typography>
          </Box>
        </Box>

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
          {dateParts && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
              <Typography variant="caption" sx={{ fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.75rem' }, fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>
                {dateParts.date}
              </Typography>
              {dateParts.time && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.55rem', sm: '0.6rem', md: '0.7rem' }, textAlign: 'center' }}>
                  {dateParts.time}
                </Typography>
              )}
            </Box>
          )}
          <IconButton size="small" onClick={() => setIsExpanded((v) => !v)} aria-expanded={isExpanded} sx={{ p: '2px' }}>
            <ExpandMoreIcon
              sx={(t) => ({
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s',
                color: t.palette.text.secondary,
                fontSize: { xs: 22, md: 26 },
              })}
            />
          </IconButton>
        </Box>

        <Box
          sx={(t) => ({
            flex: 1,
            background: !isWin ? sideBgWin(t) : sideBgLose(t),
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
            label={!isWin ? '승' : '패'}
            sx={{
              height: 22,
              fontSize: '0.7rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              color: '#fff',
              background: !isWin ? BADGE_WIN : BADGE_LOSE,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              '& .MuiChip-label': { px: 1 },
            }}
          />
          <Box sx={{ minWidth: 0, width: '100%', textAlign: 'right' }}>
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{ fontSize: { xs: '0.75rem', md: '0.9rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {battle.opp_guild_name || '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {battle.opp_wizard_name || '—'}
            </Typography>
          </Box>
        </Box>
      </Box>

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
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>
                공격 덱
              </Typography>
              <BattleHistoryMonsterCell urls={attackUrls} borderColor={isWin ? 'success.main' : 'error.main'} size={40} />
            </Box>
            <Typography variant="overline" sx={{ alignSelf: 'center', fontSize: { xs: '0.7rem', md: '0.75rem' }, fontWeight: 800, letterSpacing: '0.2em', color: 'text.secondary', px: { xs: 0.5, md: 1 } }}>
              VS
            </Typography>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>
                방어 덱
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <BattleHistoryMonsterCell urls={defenseUrls} borderColor={isWin ? 'error.main' : 'success.main'} size={40} />
              </Box>
            </Box>
          </Box>
        </Box>
      </Collapse>
    </Card>
  );
}
