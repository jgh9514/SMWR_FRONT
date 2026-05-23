'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import StarIcon from '@mui/icons-material/Star';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import SportsMmaIcon from '@mui/icons-material/SportsMma';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import {
  resolveDefaultRtaSeasonCode,
  resolveRtaSeasonIdForApi,
  useRtaPlayerNameHistory,
  useRtaPlayerSummary,
  useRtaSeasonSelect,
} from '@/features/rta/hooks/useRtaData';
import { useRtaSeasonsContext } from '@/features/rta/context/RtaSeasonsContext';
import { RtaPlayerSeasonContext } from '@/features/rta/context/RtaPlayerSeasonContext';
import type { RtaPlayerSummary } from '@/features/rta/types/rta';
import PageHeader from '@/shared/ui/page-header/PageHeader';
import RtaRatingStarIcons from '@/features/rta/components/RtaRatingStarIcons';
import { RTA_SELECT_MENU_PROPS } from '@/features/rta/components/RtaSeasonTierSelectRow';
import { blurFocusedMenuItem } from '@/features/rta/rtaMenuModalProps';
import { getSwexPlayerImageUrl } from '@/shared/utils/image';
import { showToast } from '@/shared/lib/notification';
import { addRtaSessionRecent, mergeRtaSessionBookmarkFromServer } from '@/features/rta/lib/rtaSummonerSessionSearchStorage';


type NavItem = {
  href: string;
  label: string;
  icon: typeof VisibilityIcon;
  premium?: boolean;
};

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** ISO 3166-1 alpha-2 (2글자)일 때만 flagcdn 사용 */
function countryFlagSrc(country: string | undefined): string | null {
  const c = (country ?? '').trim();
  if (!c || c === '—') return null;
  if (!/^[a-z]{2}$/i.test(c)) return null;
  return `https://flagcdn.com/w40/${c.toLowerCase()}.png`;
}

function formatNameHistoryWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function buildNavItems(wizardId: string): NavItem[] {
  const base = `/rta/player/${wizardId}`;
  return [
    { href: base, label: '개요', icon: VisibilityIcon },
    { href: `${base}/picks`, label: '사용 몬스터', icon: GpsFixedIcon },
{ href: `${base}/opponents`, label: '라이벌', icon: SportsMmaIcon, premium: true },
    { href: `${base}/box`, label: '보유 몬스터', icon: Inventory2Icon, premium: true },
  ];
}

export default function RtaPlayerDetailShell({
  wizardId,
  initialSummary,
  children,
}: {
  wizardId: string;
  initialSummary: RtaPlayerSummary | null;
  children: ReactNode;
}) {
  const pathname = usePathname();

  const { data: seasonsData } = useRtaSeasonsContext();
  const { seasonSelectValue, seasonIdForApi, setSeason } = useRtaSeasonSelect(seasonsData);

  // active 표시를 위해 seasons 목록에 isActive 필드를 추가한 옵션
  const seasonOptions = useMemo(() => {
    const rows = seasonsData?.seasons;
    if (!rows?.length) return [];
    return rows.map((r) => ({
      value: r.seasonCode,
      label: r.seasonName.length > 24 ? `${r.seasonName.slice(0, 22)}…` : r.seasonName,
      active: r.isActive,
    }));
  }, [seasonsData]);

  /** RSC는 `POST .../summary` body 없음(서버 기본 시즌). 기본 시즌 선택일 때만 클라 쿼리에 시드한다. */
  const rscSummaryInitial = useMemo((): RtaPlayerSummary | undefined => {
    if (initialSummary == null) return undefined;
    const rows = seasonsData?.seasons;
    if (!rows?.length) return undefined;
    const defaultCode = resolveDefaultRtaSeasonCode(seasonsData, '');
    const defaultSid = resolveRtaSeasonIdForApi(rows, defaultCode);
    if (defaultSid == null || seasonIdForApi == null) return undefined;
    if (seasonIdForApi !== defaultSid) return undefined;
    return initialSummary;
  }, [initialSummary, seasonsData, seasonIdForApi]);

  const { data: summary, refetch, isFetching } = useRtaPlayerSummary(
    wizardId,
    rscSummaryInitial,
    seasonSelectValue,
    { seasonId: seasonIdForApi },
  );

  /** 검색/헤더가 아닌 랭킹·URL 직접 진입이어도 sessionStorage 최근검색에 1회 반영 */
  const sessionRecentForWizardRef = useRef<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = String(wizardId).trim();
    if (!w) return;
    if (sessionRecentForWizardRef.current === w) {
      return;
    }
    const s = summary ?? initialSummary;
    if (!s) {
      return;
    }
    const name = s.found && s.wizard_name?.trim() ? s.wizard_name.trim() : `소환사 ${w}`;
    const ch = s.channel_uid;
    addRtaSessionRecent({
      wizardId: w,
      wizardName: name,
      channelUid: ch != null && ch !== '' ? String(ch) : undefined,
      country: s.country,
    });
    mergeRtaSessionBookmarkFromServer(w, {
      channelUid: ch,
      wizardName: s.wizard_name,
      country: s.country,
    });
    sessionRecentForWizardRef.current = w;
  }, [wizardId, initialSummary, summary]);

  const displayName = useMemo(() => {
    if (summary?.found) {
      const n = summary.wizard_name?.trim();
      if (n) return n;
    }
    return `소환사 ${wizardId}`;
  }, [summary, wizardId]);

  const channelUid = summary?.channel_uid;
  const profileSrc = getSwexPlayerImageUrl(channelUid ?? wizardId);

  const score = num(summary?.score);
  const rank = num(summary?.rank_position);
  const rating = num(summary?.rating_id);
  const winRate = num(summary?.win_rate_pct);
  const countryLabel = (summary?.country || '').trim() || '—';
  const countryFlag = countryFlagSrc(summary?.country);

  const [nameHistoryAnchor, setNameHistoryAnchor] = useState<null | HTMLElement>(null);
  const nameHistoryOpen = Boolean(nameHistoryAnchor);
  const { data: nameHistoryData, isLoading: nameHistoryLoading } = useRtaPlayerNameHistory(wizardId, {
    enabled: nameHistoryOpen,
  });
  const nameHistoryRows = nameHistoryData?.rows ?? [];
  const currentWizardName = summary?.found ? summary.wizard_name?.trim() : '';

  const navItems = useMemo(() => buildNavItems(wizardId), [wizardId]);

  const isTabActive = useCallback(
    (href: string) => {
      const pathOnly = href.split('?')[0];
      return pathname === pathOnly;
    },
    [pathname],
  );

  const activeTabIndex = useMemo(() => {
    const idx = navItems.findIndex((item) => isTabActive(item.href));
    return idx >= 0 ? idx : 0;
  }, [navItems, isTabActive]);

  const onRefresh = async () => {
    try {
      await refetch();
      showToast.success('프로필 정보를 갱신했습니다.');
    } catch {
      showToast.info('갱신에 실패했습니다.');
    }
  };

  return (
    <Container
      maxWidth="lg"
      sx={{
        py: { xs: 1.25, md: 4 },
        px: { xs: 1.25, sm: 3 },
      }}
    >
      <Box sx={{ mb: { xs: 1.5, md: 3 } }}>
        <PageHeader title={displayName} backPath="/rta/summoner-ranking" />
      </Box>

      <Box
        sx={{
          p: { xs: 1.25, sm: 3 },
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          mb: 0,
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 2, sm: 3 }}
          alignItems={{ xs: 'center', sm: 'flex-start' }}
          justifyContent="space-between"
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 2, sm: 3 }}
            alignItems={{ xs: 'center', sm: 'flex-start' }}
            sx={{ flex: 1, minWidth: 0, width: '100%' }}
          >
            <Box sx={{ position: 'relative', flexShrink: 0 }}>
              <Avatar
                src={profileSrc}
                alt={displayName}
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
                  {displayName}
                </Typography>
                <IconButton
                  size="small"
                  onClick={(e) => setNameHistoryAnchor(e.currentTarget)}
                  aria-label="이전 닉네임 보기"
                  title="이전 닉네임"
                  sx={{ color: 'text.secondary', flexShrink: 0 }}
                >
                  <HistoryIcon fontSize="small" />
                </IconButton>
                <Menu
                  anchorEl={nameHistoryAnchor}
                  open={nameHistoryOpen}
                  onClose={() => {
                    blurFocusedMenuItem();
                    setNameHistoryAnchor(null);
                  }}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                  {...RTA_SELECT_MENU_PROPS}
                  slotProps={{
                    ...RTA_SELECT_MENU_PROPS.slotProps,
                    paper: { sx: { maxWidth: 'min(100vw - 24px, 360px)', width: 320 } },
                  }}
                >
                  <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      이전 닉네임
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      수집된 RTA 리플레이 기준
                    </Typography>
                  </Box>
                  {nameHistoryLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                      <CircularProgress size={24} aria-label="닉네임 목록 불러오는 중" />
                    </Box>
                  ) : nameHistoryRows.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
                      기록된 닉네임이 없습니다.
                    </Typography>
                  ) : (
                    <List dense disablePadding sx={{ pb: 1, maxHeight: 320, overflow: 'auto' }}>
                      {nameHistoryRows.map((row) => {
                        const name = row.wizard_name?.trim() || '—';
                        const isCurrent = Boolean(currentWizardName && name === currentWizardName);
                        return (
                          <ListItem key={name} sx={{ py: 0.75, px: 2 }}>
                            <ListItemText
                              primary={
                                <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                                  <Typography component="span" variant="body2" fontWeight={isCurrent ? 700 : 500}>
                                    {name}
                                  </Typography>
                                  {isCurrent ? (
                                    <Chip label="현재" size="small" color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />
                                  ) : null}
                                </Stack>
                              }
                              secondary={
                                <Typography variant="caption" color="text.secondary" component="span">
                                  {formatNameHistoryWhen(row.first_seen_at)} ~ {formatNameHistoryWhen(row.last_seen_at)}
                                  {row.match_count != null && row.match_count > 0
                                    ? ` · ${row.match_count.toLocaleString()}경기`
                                    : ''}
                                </Typography>
                              }
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                  )}
                </Menu>
                {!summary && isFetching ? (
                  <Skeleton variant="rounded" width={48} height={24} />
                ) : (
                  <>
                    {countryFlag ? (
                      <Box
                        component="img"
                        src={countryFlag}
                        alt=""
                        sx={{
                          width: 28,
                          height: 18,
                          objectFit: 'cover',
                          borderRadius: 0.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          flexShrink: 0,
                        }}
                      />
                    ) : null}
                    <Chip
                      size="small"
                      label={countryLabel}
                      sx={{
                        fontWeight: 700,
                        border: '1px solid',
                        borderColor: 'primary.main',
                        bgcolor: (t) => (t.palette.mode === 'dark' ? 'primary.dark' : 'primary.light'),
                        color: 'primary.main',
                      }}
                    />
                  </>
                )}
              </Stack>

              <Stack
                direction="row"
                flexWrap="wrap"
                alignItems="center"
                justifyContent={{ xs: 'center', sm: 'flex-start' }}
                gap={{ xs: 2, sm: 3 }}
                sx={{ mt: 1 }}
              >
                {!summary && isFetching ? (
                  <>
                    <Skeleton variant="rounded" width={72} height={20} />
                    <Skeleton variant="rounded" width={72} height={20} />
                    <Skeleton variant="rounded" width={72} height={20} />
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </Stack>

              {summary && !summary.found ? (
                <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                  수집된 실레나 리플레이에 없는 소환사입니다. (ID: {wizardId})
                </Typography>
              ) : null}
            </Stack>
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            gap={1}
            sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}
          >
            <FormControl size="small" sx={{ minWidth: { xs: 0, sm: 180 }, width: { xs: '100%', sm: 'auto' } }}>
              <Select
                value={seasonSelectValue}
                onChange={(e) => { blurFocusedMenuItem(); setSeason(String(e.target.value)); }}
                MenuProps={RTA_SELECT_MENU_PROPS}
                renderValue={(v) => {
                  const opt = seasonOptions.find((o) => o.value === v);
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
                {seasonOptions.map((o) => (
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
              onClick={() => void onRefresh()}
              disabled={isFetching}
              sx={{ whiteSpace: 'nowrap', alignSelf: { xs: 'stretch', sm: 'center' } }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                업데이트
              </Box>
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Box
        component="nav"
        aria-label="플레이어 상세 탭"
        sx={{
          mx: { xs: -0.25, sm: 0 },
          pb: 0,
          borderBottom: '1px solid',
          borderColor: 'divider',
          '& .MuiTabs-scrollButtons': {
            '&.Mui-disabled': { opacity: 0.35 },
          },
        }}
      >
        <Tabs
          value={activeTabIndex}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: { xs: 44, sm: 48 },
            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
            '& .MuiTabs-flexContainer': { gap: { xs: 0, sm: 0.25 } },
          }}
        >
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const selected = activeTabIndex === index;
            return (
              <Tab
                key={item.href}
                component={Link}
                href={item.href}
                scroll={false}
                value={index}
                disableRipple
                label={
                  <Stack
                    component="span"
                    direction="row"
                    alignItems="center"
                    justifyContent="center"
                    spacing={0.25}
                    sx={{ gap: 0.5 }}
                  >
                    <Icon sx={{ fontSize: { xs: 17, sm: 18 }, opacity: selected ? 1 : 0.85 }} />
                    <Box
                      component="span"
                      sx={{
                        fontWeight: selected ? 700 : 600,
                        fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.label}
                    </Box>
                    {item.premium ? (
                      <WorkspacePremiumIcon sx={{ fontSize: 13, ml: 0.25, color: 'warning.main', flexShrink: 0 }} />
                    ) : null}
                  </Stack>
                }
                sx={{
                  minHeight: { xs: 44, sm: 48 },
                  py: { xs: 0.75, sm: 1 },
                  px: { xs: 1, sm: 1.5 },
                  minWidth: { xs: 64, sm: 80 },
                  textTransform: 'none',
                  color: 'text.secondary',
                  opacity: 1,
                  '&.Mui-selected': {
                    color: 'primary.main',
                  },
                }}
              />
            );
          })}
        </Tabs>
      </Box>

      <Box sx={{ px: { xs: 0, sm: 0 }, pt: { xs: 1.5, sm: 2 }, pb: { xs: 2, sm: 4 } }}>
        <RtaPlayerSeasonContext.Provider
          value={{ seasonCode: seasonSelectValue, seasonId: seasonIdForApi }}
        >
          {children}
        </RtaPlayerSeasonContext.Provider>
      </Box>
    </Container>
  );
}
