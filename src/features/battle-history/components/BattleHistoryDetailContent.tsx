'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Typography,
} from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BattleHistoryMatchListCard from '@/features/battle-history/components/BattleHistoryMatchListCard';
import type { BattleItem } from '@/features/battle-history/types/battle-history';

interface BattleHistoryDetailContentProps {
  battles: BattleItem[];
  wizardName?: string;
  seasonNo?: string;
  backPath?: string;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  isInitialLoading?: boolean;
  onLoadMore?: () => void;
}

function pageBg(t: Theme) {
  return t.palette.mode === 'dark'
    ? `linear-gradient(180deg, ${alpha('#0f172a', 1)} 0%, ${alpha('#1e293b', 1)} 40%, ${alpha('#0f172a', 1)} 100%)`
    : `linear-gradient(180deg, ${alpha('#f0fdfa', 1)} 0%, ${alpha('#ecfeff', 0.9)} 35%, ${alpha('#f8fafc', 1)} 100%)`;
}

export default function BattleHistoryDetailContent({
  battles,
  wizardName = '',
  seasonNo,
  backPath = '/battle-history',
  hasMore = false,
  isLoadingMore = false,
  isInitialLoading = false,
  onLoadMore,
}: BattleHistoryDetailContentProps) {
  const summary = useMemo(() => {
    const first = battles[0];
    if (first?.full_total_count != null) {
      return {
        win: Number(first.full_win_count ?? 0),
        lose: Number(first.full_lose_count ?? 0),
        total: Number(first.full_total_count),
      };
    }
    let win = 0;
    let lose = 0;
    battles.forEach((r) => {
      if (r.win_lose === '1') win += 1;
      else lose += 1;
    });
    return { win, lose, total: battles.length };
  }, [battles]);

  const displayName = wizardName || battles[0]?.wizard_name || '소환사';
  const hasNoData = battles.length === 0;

  return (
    <Box
      sx={(theme) => ({
        minHeight: '100%',
        background: pageBg(theme),
        pb: { xs: 3, md: 5 },
      })}
    >
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
        <Card
          elevation={0}
          sx={(theme) => ({
            borderRadius: 4,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: alpha(theme.palette.divider, 0.12),
            background:
              theme.palette.mode === 'dark'
                ? alpha(theme.palette.background.paper, 0.55)
                : alpha('#ffffff', 0.72),
            backdropFilter: 'blur(16px)',
            boxShadow:
              theme.palette.mode === 'dark' ? '0 24px 80px rgba(0,0,0,0.35)' : '0 20px 60px rgba(15,23,42,0.08)',
          })}
        >
          <Box
            sx={(theme) => ({
              px: { xs: 2, md: 3 },
              pt: { xs: 2.5, md: 3 },
              pb: 2,
              borderBottom: '1px solid',
              borderColor: alpha(theme.palette.divider, 0.15),
              background:
                theme.palette.mode === 'dark'
                  ? `linear-gradient(135deg, ${alpha('#10b981', 0.12)} 0%, transparent 55%)`
                  : `linear-gradient(135deg, ${alpha('#ccfbf1', 0.9)} 0%, ${alpha('#ffffff', 0)} 50%)`,
            })}
          >
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                <Button
                  component={Link}
                  href={backPath}
                  variant="outlined"
                  size="small"
                  startIcon={<ArrowBackIcon />}
                  sx={{ alignSelf: 'flex-start', borderRadius: 2 }}
                >
                  목록
                </Button>
                <Box>
                  <Typography
                    variant="overline"
                    sx={{ letterSpacing: '0.2em', color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}
                  >
                    GUILD SIEGE
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                    {displayName} 전적
                  </Typography>
                  {!isInitialLoading && !hasNoData && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontWeight: 500 }}>
                      총 {summary.total}전 ·{' '}
                      <Box component="span" sx={{ color: 'success.main', fontWeight: 700 }}>
                        {summary.win}승
                      </Box>{' '}
                      ·{' '}
                      <Box component="span" sx={{ color: 'error.main', fontWeight: 700 }}>
                        {summary.lose}패
                      </Box>
                    </Typography>
                  )}
                </Box>
              </Box>
              {seasonNo && (
                <Chip
                  label={`시즌 ${seasonNo}`}
                  size="small"
                  sx={(theme) => ({
                    fontWeight: 700,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    border: '1px solid',
                    borderColor: alpha(theme.palette.primary.main, 0.25),
                  })}
                />
              )}
            </Box>
          </Box>

          <CardContent sx={{ p: { xs: 2, md: 2.5 }, pt: { xs: 2, md: 2.5 } }}>
            {isInitialLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <CircularProgress size={48} thickness={4} sx={{ color: 'primary.main' }} />
                  <Typography sx={{ mt: 2, color: 'text.secondary', fontWeight: 500 }}>
                    전적 데이터를 불러오는 중…
                  </Typography>
                </Box>
              </Box>
            )}

            {!isInitialLoading && hasNoData && (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                  전적 데이터가 없습니다.
                </Typography>
              </Box>
            )}

            {!isInitialLoading && !hasNoData && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
                {battles.map((battle, index) => (
                  <BattleHistoryMatchListCard
                    key={`${battle.match_id}-${battle.log_id ?? index}`}
                    battle={battle}
                  />
                ))}
              </Box>
            )}

            {(hasMore || isLoadingMore) && onLoadMore && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 1 }}>
                <Button
                  variant="outlined"
                  onClick={onLoadMore}
                  disabled={isLoadingMore}
                  startIcon={isLoadingMore ? <CircularProgress size={16} thickness={4} /> : undefined}
                  sx={(theme) => ({
                    borderRadius: 2,
                    px: 5,
                    py: 1,
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    borderColor: alpha(theme.palette.primary.main, 0.5),
                    '&:hover': { borderColor: theme.palette.primary.main },
                  })}
                >
                  {isLoadingMore ? '불러오는 중…' : '더보기'}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
