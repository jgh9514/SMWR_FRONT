'use client';

import { Box, Card, CardContent, Checkbox, Divider, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import StarIcon from '@mui/icons-material/Star';
import type { GuildInfo } from '@/features/siege/types/siege';
import { getRatingColor, getRatingStars } from '@/shared/utils';

type SiegeOpponentGuildPickerProps = {
  guilds: GuildInfo[];
  selectedGuilds: string[];
  onToggle: (guildName: string) => void;
  /** 모바일 사이드바·하단 카드용 컴팩트 패딩 */
  compact?: boolean;
};

export function SiegeOpponentGuildPicker({
  guilds,
  selectedGuilds,
  onToggle,
  compact = false,
}: SiegeOpponentGuildPickerProps) {
  if (guilds.length === 0) {
    return null;
  }

  return (
    <Card sx={{ boxShadow: 2 }}>
      <Box
        sx={(t) => ({
          background: `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${alpha(t.palette.primary.main, 0.85)} 100%)`,
          color: t.palette.primary.contrastText,
          px: compact ? 2 : 3,
          py: compact ? 1.5 : 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        })}
      >
        <Typography variant={compact ? 'subtitle2' : 'subtitle1'} sx={{ fontWeight: 600 }}>
          상대 길드 선택
        </Typography>
      </Box>
      <Divider />
      <CardContent sx={{ p: 0 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
          }}
        >
          {guilds.map((guild) => {
            const isSelected = selectedGuilds.includes(guild.guild_name);
            return (
              <Box
                key={guild.guild_name}
                onClick={() => onToggle(guild.guild_name)}
                sx={(t) => ({
                  display: 'flex',
                  alignItems: 'center',
                  p: compact ? 1.5 : 2,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease, border-color 0.2s ease',
                  borderRight: '1px solid',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: isSelected
                    ? alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.18 : 0.1)
                    : 'background.paper',
                  borderLeft: isSelected ? '4px solid' : 'none',
                  borderLeftColor: isSelected ? 'primary.main' : 'transparent',
                  '&:hover': {
                    bgcolor: isSelected
                      ? alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.24 : 0.14)
                      : 'action.hover',
                  },
                })}
              >
                <Checkbox
                  checked={isSelected}
                  onChange={() => onToggle(guild.guild_name)}
                  color="primary"
                  size="small"
                  sx={{ mr: 1.5 }}
                  onClick={(e) => e.stopPropagation()}
                />
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      mb: compact ? 0.5 : 0.75,
                      fontSize: '0.875rem',
                      color: 'text.primary',
                    }}
                    noWrap
                  >
                    {guild.guild_name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
                    {Array.from({ length: getRatingStars(guild.rating) }).map((_, i) => (
                      <StarIcon
                        key={i}
                        sx={{
                          fontSize: compact ? 12 : 14,
                          color: getRatingColor(guild.rating),
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
}
