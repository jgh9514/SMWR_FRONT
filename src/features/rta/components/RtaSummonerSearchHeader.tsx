'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Autocomplete, Avatar, Box, CircularProgress, IconButton, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { useRtaSummonerSearch } from '@/features/rta/hooks/useRtaData';
import { useRtaSummonerSessionSearchLists } from '@/features/rta/hooks/useRtaSummonerSessionSearchLists';
import { filterSessionBookmarks } from '@/features/rta/lib/rtaSummonerSessionSearchStorage';
import RtaSummonerSessionSearchPanel from '@/features/rta/components/RtaSummonerSessionSearchPanel';
import type { RtaSummonerSearchHit } from '@/features/rta/types/rta';
import { getSwexPlayerImageUrl } from '@/shared/utils/image';

function pickWizardId(row: RtaSummonerSearchHit): string {
  const w = row.wizard_id;
  return w != null ? String(w).trim() : '';
}

function pickWizardName(row: RtaSummonerSearchHit): string {
  return String(row.wizard_name ?? '').trim() || '—';
}

function countryFlagSrc(country: string | undefined): string | null {
  const c = (country ?? '').trim();
  if (!c || c === '—') return null;
  if (!/^[a-z]{2}$/i.test(c)) return null;
  return `https://flagcdn.com/w20/${c.toLowerCase()}.png`;
}

/**
 * 글로벌 헤더용 RTA 소환사 검색. 홈 히어로와 동일 sessionStorage(최근검색·즐겨찾기).
 */
export default function RtaSummonerSearchHeader() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 300);
    return () => clearTimeout(t);
  }, [input]);

  const { data, isFetching } = useRtaSummonerSearch(debounced, null);
  const options = useMemo(() => data?.results ?? [], [data]);

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

  /** Autocomplete(포털)과 세션 패널 동시 표시로 겹침 방지 */
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
      sx={{
        position: 'relative',
        width: { xs: 148, sm: 228 },
        maxWidth: '36vw',
        minWidth: 0,
        flexShrink: 1,
      }}
    >
      <Autocomplete<RtaSummonerSearchHit, false, false, false>
        size="small"
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
        sx={{
          width: '100%',
        }}
        slotProps={{
          paper: {
            sx: {
              bgcolor: 'rgba(30, 41, 59, 0.98)',
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
          const flag = countryFlagSrc(option.country);
          const fav = isFavorite(wid);
          return (
            <Box
              component="li"
              key={key}
              {...other}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, pl: 1, pr: 0.5 }}
            >
              <Avatar src={getSwexPlayerImageUrl(wid)} alt="" sx={{ width: 28, height: 28, flexShrink: 0 }} />
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
              ) : (
                <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0, width: 20, textAlign: 'center' }}>
                  —
                </Typography>
              )}
              <IconButton
                type="button"
                size="small"
                tabIndex={-1}
                aria-label={fav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  toggleFavorite(toBookmark(option));
                }}
                sx={{ color: fav ? 'warning.main' : 'action.active', flexShrink: 0, p: 0.5 }}
              >
                {fav ? <StarIcon sx={{ fontSize: 18 }} /> : <StarBorderIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </Box>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="소환사 검색"
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
                  <SearchIcon sx={{ color: 'rgba(255,255,255,0.5)', mr: 0.5, ml: 0.25, fontSize: 20 }} />
                  {params.InputProps.startAdornment}
                </>
              ),
              endAdornment: (
                <>
                  {isFetching ? <CircularProgress color="inherit" size={16} sx={{ mr: 1 }} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'rgba(255,255,255,0.9)',
                fontSize: '0.8125rem',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.45)' },
                '&.Mui-focused fieldset': { borderColor: 'rgba(255,255,255,0.55)' },
              },
              '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.45)' },
            }}
          />
        )}
      />

      {subPanelOpen && !apiMenuOpen && (
        <RtaSummonerSessionSearchPanel
          idPrefix="rta-sess-hdr"
          layout="dropdown"
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
  );
}
