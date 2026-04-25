'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Autocomplete,
  Avatar,
  Box,
  CircularProgress,
  Container,
  IconButton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { useRtaSummonerSessionSearchLists } from '@/features/rta/hooks/useRtaSummonerSessionSearchLists';
import { filterSessionBookmarks } from '@/features/rta/lib/rtaSummonerSessionSearchStorage';
import RtaSummonerSessionSearchPanel from '@/features/rta/components/RtaSummonerSessionSearchPanel';
import { useRtaSummonerSearch } from '@/features/rta/hooks/useRtaData';
import type { RtaSummonerSearchHit } from '@/features/rta/types/rta';
import { getSwexPlayerImageUrl } from '@/shared/utils/image';
import { SITE_NAME_DISPLAY } from '@/shared/lib/seo';

function pickWizardId(row: RtaSummonerSearchHit): string {
  const w = row.wizard_id;
  return w != null ? String(w).trim() : '';
}

function pickWizardName(row: RtaSummonerSearchHit): string {
  return String(row.wizard_name ?? '').trim() || '—';
}

function pickChannelUid(row: RtaSummonerSearchHit): string | undefined {
  const u = row.channel_uid;
  if (u == null || u === '') return undefined;
  return String(u).trim();
}

function countryFlagSrc(country: string | undefined): string | null {
  const c = (country ?? '').trim();
  if (!c || c === '—') return null;
  if (!/^[a-z]{2}$/i.test(c)) return null;
  return `https://flagcdn.com/w20/${c.toLowerCase()}.png`;
}

/** 홈 히어로: 메인 배너 + RTA 소환사 검색(집계·기본 시즌, 서버 결정). */
export default function HomeMainVisual() {
  const router = useRouter();
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 300);
    return () => clearTimeout(t);
  }, [input]);

  const { data, isFetching } = useRtaSummonerSearch(debounced, null);
  const options = useMemo(() => data?.results ?? [], [data]);

  /** 세션 기준(탭) 최근/즐겨찾기 패널: 검색창 포커스 시 표시, 기본 탭=최근 */
  const [subPanelOpen, setSubPanelOpen] = useState(false);
  const [sessionListTab, setSessionListTab] = useState(0);
  const subPanelBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openSubPanel = useCallback(() => {
    if (subPanelBlurTimer.current) {
      clearTimeout(subPanelBlurTimer.current);
      subPanelBlurTimer.current = null;
    }
    setSessionListTab(0);
    setSubPanelOpen(true);
  }, []);
  const scheduleCloseSubPanel = useCallback(() => {
    if (subPanelBlurTimer.current) {
      clearTimeout(subPanelBlurTimer.current);
    }
    subPanelBlurTimer.current = setTimeout(() => {
      setSubPanelOpen(false);
      subPanelBlurTimer.current = null;
    }, 200);
  }, []);
  useEffect(
    () => () => {
      if (subPanelBlurTimer.current) clearTimeout(subPanelBlurTimer.current);
    },
    [],
  );

  const {
    recent: recentList,
    favorites: favoriteList,
    addRecent,
    removeRecent,
    isFavorite,
    toggleFavorite,
  } = useRtaSummonerSessionSearchLists();

  const toBookmark = useCallback((v: RtaSummonerSearchHit) => {
    return {
      wizardId: pickWizardId(v),
      wizardName: pickWizardName(v),
      channelUid: pickChannelUid(v),
      country: v.country,
    };
  }, []);

  const goPlayer = useCallback(
    (wizardId: string) => {
      if (!wizardId) return;
      router.push(`/rta/player/${encodeURIComponent(wizardId)}`);
      setInput('');
      setDebounced('');
    },
    [router],
  );

  const handleSelect = useCallback(
    (_: unknown, v: RtaSummonerSearchHit | null) => {
      if (!v) return;
      const id = pickWizardId(v);
      if (!id) return;
      addRecent(toBookmark(v));
      goPlayer(id);
    },
    [addRecent, goPlayer, toBookmark],
  );

  const openBookmark = useCallback(
    (b: { wizardId: string; wizardName: string; channelUid?: string; country?: string }) => {
      if (!b.wizardId) return;
      addRecent(b);
      goPlayer(b.wizardId);
    },
    [addRecent, goPlayer],
  );

  const sessionFilteredRecent = useMemo(
    () => filterSessionBookmarks(recentList, input),
    [recentList, input],
  );
  const sessionFilteredFav = useMemo(
    () => filterSessionBookmarks(favoriteList, input),
    [favoriteList, input],
  );
  const hasSessionFilter = input.trim() !== '';

  /** API 드롭다운(포털)과 세션 패널이 동시에 떠서 겹치는 것 방지: 검색 API 목록이 열릴 때는 세션 패널만 숨김 */
  const [acListboxOpen, setAcListboxOpen] = useState(false);
  const canQueryApi = input.trim().length > 0;
  const apiMenuOpen = canQueryApi && acListboxOpen;
  useEffect(() => {
    if (!canQueryApi) {
      setAcListboxOpen(false);
    }
  }, [canQueryApi]);

  return (
    <Box
      className="main-visual"
      sx={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        color: 'common.white',
        py: { xs: 3.5, md: 6 },
        minHeight: { xs: 280, sm: 320, md: 360 },
        bgcolor: '#0a1526',
        backgroundImage: 'url(/main_banner.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: `linear-gradient(180deg, rgba(4, 12, 24, 0.5) 0%, rgba(4, 12, 24, 0.62) 100%),
            radial-gradient(circle at 50% 0%, ${theme.palette.mode === 'dark' ? 'rgba(30, 58, 99, 0.35)' : 'rgba(30, 64, 120, 0.25)'} 0%, transparent 55%)`,
          pointerEvents: 'none',
        },
      }}
    >
      <Container
        className="inner"
        maxWidth="md"
        sx={{ position: 'relative', zIndex: 1, px: { xs: 2, sm: 3 } }}
      >
        <Stack spacing={{ xs: 2.5, md: 3.5 }} alignItems="center" textAlign="center">
          <Box>
            <Typography
              component="h1"
              className="game-bi"
              sx={{
                fontWeight: 900,
                letterSpacing: { xs: '0.04em', md: '0.08em' },
                fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.75rem' },
                lineHeight: 1.1,
                textTransform: 'uppercase',
                background: (t) =>
                  `linear-gradient(180deg, ${t.palette.common.white} 0%, ${t.palette.mode === 'dark' ? 'rgba(226, 232, 240, 0.85)' : 'rgba(226, 232, 255, 0.92)'} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.5))',
              }}
            >
              {SITE_NAME_DISPLAY}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                mt: 1.25,
                color: 'rgba(255,255,255,0.88)',
                textShadow: '0 1px 8px rgba(0,0,0,0.45)',
                fontWeight: 500,
                fontSize: { xs: '0.8rem', md: '0.9rem' },
                maxWidth: 420,
                mx: 'auto',
              }}
            >
              RTA 랭킹·몬스터·점령전 — 소환사 닉으로 바로 이동
            </Typography>
          </Box>

          <Box
            id="main-search-box"
            sx={{
              width: '100%',
              maxWidth: 640,
            }}
          >
            <Box className="searchbox-wrap" sx={{ width: '100%' }}>
                <Autocomplete<RtaSummonerSearchHit, false, false, false>
                  size={isMdUp ? 'medium' : 'small'}
                  fullWidth
                  options={options}
                  loading={isFetching}
                  filterOptions={(x) => x}
                  getOptionLabel={(o) => pickWizardName(o)}
                  isOptionEqualToValue={(a, b) => pickWizardId(a) === pickWizardId(b)}
                  inputValue={input}
                  open={apiMenuOpen}
                  onOpen={() => setAcListboxOpen(true)}
                  onClose={() => setAcListboxOpen(false)}
                  onInputChange={(_, v, reason) => {
                    if (reason === 'reset' || reason === 'blur') {
                      return;
                    }
                    setInput(v);
                  }}
                  onChange={handleSelect}
                  value={null}
                  blurOnSelect
                  clearOnBlur={false}
                  noOptionsText="결과 없음"
                  slotProps={{
                    paper: {
                      sx: {
                        mt: 0.5,
                        bgcolor: 'rgba(15, 23, 42, 0.98)',
                        color: 'rgba(255,255,255,0.92)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        '& .MuiAutocomplete-option': { fontSize: '0.875rem' },
                      },
                    },
                  }}
                  renderOption={(props, option) => {
                    const { key, ...other } = props;
                    const wid = pickWizardId(option);
                    const nm = pickWizardName(option);
                    const ch = pickChannelUid(option);
                    const flag = countryFlagSrc(option.country);
                    const fav = isFavorite(wid);
                    return (
                      <Box
                        component="li"
                        key={key}
                        {...other}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, pl: 1, pr: 0.5 }}
                      >
                        <Avatar
                          src={getSwexPlayerImageUrl(ch ?? wid)}
                          alt=""
                          sx={{ width: 32, height: 32, flexShrink: 0 }}
                        />
                        <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0, fontWeight: 600 }}>
                          {nm}
                        </Typography>
                        {flag ? (
                          <Box
                            component="img"
                            src={flag}
                            alt=""
                            sx={{ width: 20, height: 14, objectFit: 'cover', borderRadius: 0.5, flexShrink: 0 }}
                          />
                        ) : null}
                        <IconButton
                          type="button"
                          size="small"
                          tabIndex={-1}
                          aria-label={fav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            toggleFavorite(toBookmark(option));
                          }}
                          sx={{ color: fav ? 'warning.main' : 'action.active', flexShrink: 0 }}
                        >
                          {fav ? <StarIcon sx={{ fontSize: 20 }} /> : <StarBorderIcon sx={{ fontSize: 20 }} />}
                        </IconButton>
                      </Box>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      className="search-input"
                      placeholder="소환사 닉네임"
                      aria-label="RTA 소환사 검색"
                      inputProps={{
                        ...params.inputProps,
                        onFocus: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                          (
                            params.inputProps as {
                              onFocus?: (ev: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
                            }
                          ).onFocus?.(e);
                          openSubPanel();
                        },
                        onBlur: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                          (
                            params.inputProps as {
                              onBlur?: (ev: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
                            }
                          ).onBlur?.(e);
                          scheduleCloseSubPanel();
                        },
                      }}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <SearchIcon sx={{ color: 'action.active', mr: 0.5, ml: 0.25, fontSize: 24 }} />
                            {params.InputProps.startAdornment}
                          </>
                        ),
                        endAdornment: (
                          <>
                            {isFetching ? <CircularProgress color="inherit" size={18} sx={{ mr: 1 }} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'rgba(255,255,255,0.98)',
                          borderRadius: 1,
                          fontSize: '0.95rem',
                        },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.12)' },
                        '& .MuiInputBase-input::placeholder': { opacity: 0.55 },
                      }}
                    />
                  )}
                />

            {subPanelOpen && !apiMenuOpen && (
              <RtaSummonerSessionSearchPanel
                idPrefix="rta-sess-home"
                layout="inline"
                sessionListTab={sessionListTab}
                onSessionListTabChange={setSessionListTab}
                favoriteListLength={favoriteList.length}
                sessionFilteredRecent={sessionFilteredRecent}
                sessionFilteredFav={sessionFilteredFav}
                hasSessionFilter={hasSessionFilter}
                isFavorite={isFavorite}
                onOpenBookmark={openBookmark}
                onToggleFavorite={toggleFavorite}
                onRemoveRecent={removeRecent}
              />
            )}
            </Box>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
