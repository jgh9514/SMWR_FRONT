'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  FormControl,
  IconButton,
  MenuItem,
  Popover,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import StarIcon from '@mui/icons-material/Star';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import SportsMmaIcon from '@mui/icons-material/SportsMma';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import RtaRatingStarIcons from '@/features/rta/components/RtaRatingStarIcons';
import { getSwexPlayerImageUrl } from '@/shared/utils/image';
import { showToast } from '@/shared/lib/notification';

const SEASON_OPTIONS = [
  { value: 's36-sl', label: 'S36 SL', active: true },
  { value: 's35-sl', label: 'S35 SL', active: false },
];

type NavItem = {
  href: string;
  label: string;
  icon: typeof VisibilityIcon;
  premium?: boolean;
};

function buildNavItems(wizardId: string): NavItem[] {
  const base = `/rta/player/${wizardId}`;
  return [
    { href: base, label: '개요', icon: VisibilityIcon },
    { href: `${base}/picks`, label: '사용 몬스터', icon: GpsFixedIcon },
    { href: `${base}/synergies`, label: '시너지', icon: Diversity3Icon, premium: true },
    { href: `${base}/opponents`, label: '라이벌', icon: SportsMmaIcon, premium: true },
    { href: `${base}/box`, label: '보유 몬스터', icon: Inventory2Icon, premium: true },
  ];
}

export default function RtaPlayerDetailShell({
  wizardId,
  children,
}: {
  wizardId: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  /** URL에는 wizard_id만 사용. 프로필·통계는 추후 API 연동 */
  const name = `소환사 ${wizardId}`;
  const profileSrc = getSwexPlayerImageUrl(wizardId);
  const score: number | null = null;
  const rank: number | null = null;
  const rating: number | null = null;
  const winRate: number | null = null;

  const [season, setSeason] = useState(SEASON_OPTIONS[0].value);
  const [fav, setFav] = useState(false);
  const [akaAnchor, setAkaAnchor] = useState<HTMLElement | null>(null);

  const navItems = useMemo(() => buildNavItems(wizardId), [wizardId]);

  const isTabActive = useCallback(
    (href: string) => {
      const pathOnly = href.split('?')[0];
      return pathname === pathOnly;
    },
    [pathname],
  );

  const onRefresh = () => {
    showToast.info('상세 데이터 연동은 준비 중입니다.');
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <PageHeader title="RTA 소환사 상세" backPath="/rta/summoner-ranking" />

      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          mb: 0,
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={3}
          alignItems={{ xs: 'center', sm: 'flex-start' }}
          justifyContent="space-between"
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={3}
            alignItems={{ xs: 'center', sm: 'flex-start' }}
            sx={{ flex: 1, minWidth: 0, width: '100%' }}
          >
            <Box sx={{ position: 'relative', flexShrink: 0 }}>
              <Avatar
                src={profileSrc}
                alt={name}
                variant="rounded"
                sx={{
                  width: 80,
                  height: 80,
                  border: '2px solid',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                }}
              />
            </Box>

            <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0, textAlign: { xs: 'center', sm: 'left' } }}>
              <Stack
                direction="row"
                flexWrap="wrap"
                alignItems="center"
                justifyContent={{ xs: 'center', sm: 'flex-start' }}
                gap={1.5}
              >
                <Typography variant="h5" component="h1" fontWeight={800} noWrap sx={{ maxWidth: '100%' }}>
                  {name}
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  color="inherit"
                  onClick={(e) => setAkaAnchor(e.currentTarget)}
                  startIcon={<HistoryIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    minWidth: 0,
                    px: 0.75,
                    py: 0.25,
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  aria-label="이전 닉네임 보기"
                >
                  aka
                </Button>
                <Popover
                  open={Boolean(akaAnchor)}
                  anchorEl={akaAnchor}
                  onClose={() => setAkaAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                >
                  <Box sx={{ p: 2, maxWidth: 280 }}>
                    <Typography variant="body2" color="text.secondary">
                      닉네임 변경 이력은 추후 연동 예정입니다.
                    </Typography>
                  </Box>
                </Popover>

                <Chip
                  size="small"
                  label="ASIA"
                  sx={{
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: 'primary.main',
                    bgcolor: (t) => (t.palette.mode === 'dark' ? 'primary.dark' : 'primary.light'),
                    color: 'primary.main',
                  }}
                />

                <IconButton
                  size="small"
                  color={fav ? 'error' : 'default'}
                  onClick={() => setFav((v) => !v)}
                  aria-label="플레이어 추적"
                  title="플레이어 추적"
                >
                  {fav ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                </IconButton>
              </Stack>

              <Stack
                direction="row"
                flexWrap="wrap"
                alignItems="center"
                justifyContent={{ xs: 'center', sm: 'flex-start' }}
                gap={{ xs: 2, sm: 3 }}
                sx={{ mt: 1 }}
              >
                <Stack direction="row" alignItems="baseline" gap={0.75}>
                  <Typography variant="body2" color="text.secondary">
                    점수
                  </Typography>
                  <Typography variant="body1" fontWeight={700} color="primary.main" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {score != null ? score.toLocaleString() : '—'}
                  </Typography>
                </Stack>
                <Stack direction="row" alignItems="baseline" gap={0.75}>
                  <Typography variant="body2" color="text.secondary">
                    랭크
                  </Typography>
                  <Typography variant="body1" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {rank != null ? `#${rank.toLocaleString()}` : '—'}
                  </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" gap={0.75}>
                  <Typography variant="body2" color="text.secondary">
                    승률
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight={700}
                    color={winRate != null ? 'success.main' : 'text.primary'}
                    sx={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {winRate != null ? `${winRate.toFixed(1)}%` : '—'}
                  </Typography>
                </Stack>
                {rating != null ? <RtaRatingStarIcons rating={rating} size={16} /> : null}
              </Stack>
            </Stack>
          </Stack>

          <Stack direction="row" alignItems="center" gap={1} sx={{ flexShrink: 0 }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select
                value={season}
                onChange={(e) => setSeason(String(e.target.value))}
                renderValue={(v) => {
                  const opt = SEASON_OPTIONS.find((o) => o.value === v);
                  return (
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: opt?.active ? 'success.main' : 'text.disabled',
                          flexShrink: 0,
                        }}
                      />
                      <StarIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                      <Typography variant="body2" component="span" noWrap>
                        {opt?.label ?? v}
                      </Typography>
                    </Stack>
                  );
                }}
              >
                {SEASON_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: o.active ? 'success.main' : 'text.disabled',
                        }}
                      />
                      <StarIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                      {o.label}
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={onRefresh}
              sx={{ whiteSpace: 'nowrap' }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                업데이트
              </Box>
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ px: { xs: 0, sm: 0 }, pb: 2, overflowX: 'auto' }}>
        <Stack
          direction="row"
          component="nav"
          spacing={0.5}
          sx={{
            minWidth: 'max-content',
            py: 1,
            px: { xs: 2, sm: 3 },
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {navItems.map((item) => {
            const active = isTabActive(item.href);
            const Icon = item.icon;
            return (
              <Button
                key={item.href}
                component={Link}
                href={item.href}
                prefetch={false}
                variant="text"
                size="small"
                startIcon={<Icon sx={{ fontSize: 18 }} />}
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  fontWeight: 600,
                  color: active ? 'primary.main' : 'text.secondary',
                  bgcolor: active ? (theme) => (theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.light') : 'transparent',
                  '&:hover': {
                    bgcolor: active ? undefined : 'action.hover',
                  },
                }}
              >
                {item.label}
                {item.premium ? (
                  <WorkspacePremiumIcon sx={{ fontSize: 14, ml: 0.5, color: 'warning.main' }} />
                ) : null}
              </Button>
            );
          })}
        </Stack>
      </Box>

      <Box sx={{ px: { xs: 2, sm: 3 }, pb: 4 }}>{children}</Box>
    </Container>
  );
}
