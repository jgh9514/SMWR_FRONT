'use client';

import { Box, Card, Chip, Stack, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import StarIcon from '@mui/icons-material/Star';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { getRatingColor, getRatingStars } from '@/shared/utils';
import { formatSiegeDateLabel } from '@/shared/utils/format';
import type { SiegeItem } from '@/features/siege/types/recent-siege';

type Rank = '1st' | '2nd' | '3rd';

const RANK_LABEL: Record<Rank, string> = {
  '1st': '1위',
  '2nd': '2위',
  '3rd': '3위',
};

function rankAccentColor(rank: Rank): string {
  if (rank === '1st') return '#f59e0b';
  if (rank === '2nd') return '#94a3b8';
  return '#b45309';
}

function rankPanelBg(theme: Theme, rank: Rank, isMyGuild: boolean) {
  const accent = rankAccentColor(rank);
  if (isMyGuild) {
    return `linear-gradient(165deg, ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.12)} 0%, ${alpha(theme.palette.background.paper, 1)} 72%)`;
  }
  return `linear-gradient(165deg, ${alpha(accent, theme.palette.mode === 'dark' ? 0.2 : 0.1)} 0%, ${alpha(theme.palette.background.paper, 1)} 72%)`;
}

type GuildPanelProps = {
  rank: Rank;
  guildName: string | undefined;
  rating: number | undefined;
  isMyGuild: boolean;
  attackWinCount?: number;
  totalAttackCount?: number;
  attackRate?: number;
  defenseWinCount?: number;
  totalDefenseCount?: number;
  defenseRate?: number;
  monsterCount?: number;
};

function GuildPanel({
  rank,
  guildName,
  rating,
  isMyGuild,
  attackWinCount,
  totalAttackCount,
  attackRate,
  defenseWinCount,
  totalDefenseCount,
  defenseRate,
  monsterCount,
}: GuildPanelProps) {
  const hasStats =
    (attackWinCount != null && attackWinCount !== undefined) ||
    (defenseWinCount != null && defenseWinCount !== undefined) ||
    (monsterCount != null && monsterCount !== undefined);
  const showStats = isMyGuild && hasStats;

  return (
    <Box
      sx={(t) => ({
        flex: 1,
        minWidth: 0,
        p: { xs: 1.25, md: 1.75 },
        borderRadius: 2,
        background: rankPanelBg(t, rank, isMyGuild),
        border: '1px solid',
        borderColor: isMyGuild ? alpha(t.palette.primary.main, 0.55) : alpha(t.palette.divider, 0.35),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.75,
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      })}
    >
      <Chip
        size="small"
        label={RANK_LABEL[rank]}
        sx={(t) => ({
          height: 22,
          fontWeight: 800,
          fontSize: '0.68rem',
          letterSpacing: '0.04em',
          bgcolor: alpha(rankAccentColor(rank), t.palette.mode === 'dark' ? 0.35 : 0.18),
          color: 'text.primary',
          border: '1px solid',
          borderColor: alpha(rankAccentColor(rank), 0.45),
        })}
      />
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.25 }}>
        {Array.from({ length: getRatingStars(rating) }).map((_, i) => (
          <StarIcon key={i} sx={{ fontSize: { xs: 11, md: 13 }, color: getRatingColor(rating) }} />
        ))}
      </Box>
      <Typography
        align="center"
        sx={{
          fontWeight: 700,
          fontSize: { xs: '0.78rem', md: '0.92rem' },
          lineHeight: 1.25,
          color: 'text.primary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          wordBreak: 'break-word',
          width: '100%',
        }}
      >
        {guildName || '-'}
      </Typography>
      {showStats && (
        <Stack spacing={0.35} sx={{ width: '100%', mt: 0.25 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.62rem', md: '0.7rem' }, lineHeight: 1.3 }}>
            공격{' '}
            <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {attackWinCount ?? 0}/{totalAttackCount ?? 0}
            </Box>{' '}
            ({attackRate?.toFixed(1) ?? '0.0'}%)
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.62rem', md: '0.7rem' }, lineHeight: 1.3 }}>
            방어{' '}
            <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {defenseWinCount ?? 0}/{totalDefenseCount ?? 0}
            </Box>{' '}
            ({defenseRate?.toFixed(1) ?? '0.0'}%)
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.62rem', md: '0.7rem' }, lineHeight: 1.3 }}>
            유닛{' '}
            <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {monsterCount ?? 0}
            </Box>
            마리
          </Typography>
        </Stack>
      )}
    </Box>
  );
}

type RecentSiegeMatchCardProps = {
  item: SiegeItem;
  myGuildId: string | null;
  onSelect: (item: SiegeItem) => void;
};

export default function RecentSiegeMatchCard({ item, myGuildId, onSelect }: RecentSiegeMatchCardProps) {
  const myGuildIdStr = myGuildId ? String(myGuildId) : '';
  const id1st = item.guild_id_1st != null ? String(item.guild_id_1st) : '';
  const id2nd = item.guild_id_2nd != null ? String(item.guild_id_2nd) : '';
  const id3rd = item.guild_id_3rd != null ? String(item.guild_id_3rd) : '';
  const myGuildRank: Rank | null =
    myGuildIdStr && id1st === myGuildIdStr
      ? '1st'
      : myGuildIdStr && id2nd === myGuildIdStr
        ? '2nd'
        : myGuildIdStr && id3rd === myGuildIdStr
          ? '3rd'
          : null;

  const showThird = (item.guild_count ?? 3) >= 3;
  const dateLabel = formatSiegeDateLabel(item.match_id) || item.match_id;

  return (
    <Card
      elevation={0}
      onClick={() => onSelect(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item);
        }
      }}
      aria-label={`${dateLabel} 점령전 상세 보기`}
      sx={(t) => ({
        cursor: 'pointer',
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: alpha(t.palette.divider, 0.2),
        transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
        boxShadow: t.palette.mode === 'dark' ? '0 8px 28px rgba(0,0,0,0.22)' : '0 10px 36px rgba(15,23,42,0.06)',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: alpha(t.palette.primary.main, 0.45),
          boxShadow: t.palette.mode === 'dark' ? '0 12px 40px rgba(0,0,0,0.32)' : '0 14px 44px rgba(15,23,42,0.1)',
        },
      })}
    >
      <Box
        sx={(t) => ({
          px: { xs: 2, md: 2.5 },
          py: { xs: 1.25, md: 1.5 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          borderBottom: '1px solid',
          borderColor: alpha(t.palette.divider, 0.25),
          bgcolor: alpha(t.palette.background.default, t.palette.mode === 'dark' ? 0.5 : 0.4),
        })}
      >
        <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.95rem', md: '1.05rem' }, color: 'text.primary' }}>
          {dateLabel}
        </Typography>
        <ChevronRightIcon sx={{ color: 'text.secondary', fontSize: 22 }} aria-hidden />
      </Box>
      <Box sx={{ p: { xs: 1.25, md: 1.75 } }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: { xs: 0.75, md: 1.25 },
            flexWrap: 'nowrap',
          }}
        >
          <GuildPanel
            rank="1st"
            guildName={item.guild_1st}
            rating={item.rating_1st}
            isMyGuild={myGuildRank === '1st'}
            attackWinCount={item.attack_win_count_1st}
            totalAttackCount={item.total_attack_count_1st}
            attackRate={item.attack_rate_1st}
            defenseWinCount={item.defense_win_count_1st}
            totalDefenseCount={item.total_defense_count_1st}
            defenseRate={item.defense_rate_1st}
            monsterCount={item.unique_monster_deck_count_1st}
          />
          <GuildPanel
            rank="2nd"
            guildName={item.guild_2nd}
            rating={item.rating_2nd}
            isMyGuild={myGuildRank === '2nd'}
            attackWinCount={item.attack_win_count_2nd}
            totalAttackCount={item.total_attack_count_2nd}
            attackRate={item.attack_rate_2nd}
            defenseWinCount={item.defense_win_count_2nd}
            totalDefenseCount={item.total_defense_count_2nd}
            defenseRate={item.defense_rate_2nd}
            monsterCount={item.unique_monster_deck_count_2nd}
          />
          {showThird && (
            <GuildPanel
              rank="3rd"
              guildName={item.guild_3rd}
              rating={item.rating_3rd}
              isMyGuild={myGuildRank === '3rd'}
              attackWinCount={item.attack_win_count_3rd}
              totalAttackCount={item.total_attack_count_3rd}
              attackRate={item.attack_rate_3rd}
              defenseWinCount={item.defense_win_count_3rd}
              totalDefenseCount={item.total_defense_count_3rd}
              defenseRate={item.defense_rate_3rd}
              monsterCount={item.unique_monster_deck_count_3rd}
            />
          )}
        </Box>
      </Box>
    </Card>
  );
}
