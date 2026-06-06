'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  Autocomplete,
  Avatar,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import {
  prefetchRtaPlayerPageData,
  useRtaSeasonSelect,
  useRtaSummonerSearch,
} from '@/features/rta/hooks/useRtaData';
import { useRtaSeasonsContext } from '@/features/rta/context/RtaSeasonsContext';
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

function pickChannelUid(row: RtaSummonerSearchHit): string | undefined {
  const c = row.channel_uid;
  if (c == null) return undefined;
  const t = String(c).trim();
  return t === '' ? undefined : t;
}

function countryFlagSrc(country: string | undefined): string | null {
  const c = (country ?? '').trim();
  if (!c || c === '—') return null;
  if (!/^[a-z]{2}$/i.test(c)) return null;
  return `https://flagcdn.com/w20/${c.toLowerCase()}.png`;
}

interface RtaSummonerSearchDialogProps {
  open: boolean;
  onClose: () => void;
}

function SearchDialogContent({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: seasonsData } = useRtaSeasonsContext();
  const { seasonSelectValue, seasonIdForApi } = useRtaSeasonSelect(seasonsData);
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 300);
    return () => clearTimeout(t);
  }, [input]);

  // 다이얼로그 열릴 때 자동 포커스
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const { data, isFetching } = useRtaSummonerSearch(debounced, null);
  const options = useMemo(() => data?.results ?? [], [data]);

  const [sessionListTab, setSessionListTab] = useState(0);
  const [acListboxOpen, setAcListboxOpen] = useState(false);
  const canQueryApi = input.trim().length > 0;
  const apiMenuOpen = canQueryApi && acListboxOpen;
  const inputEmpty = input.trim() === '';

  useEffect(() => {
    if (!canQueryApi) setAcListboxOpen(false);
  }, [canQueryApi]);

  const {
    recent: recentList,
    favorites: favoriteList,
    addRecent,
    removeRecent,
    isFavorite,
    toggleFavorite,
  } = useRtaSummonerSessionSearchLists();

  const toBookmark = useCallback((v: RtaSummonerSearchHit) => ({
    wizardId: pickWizardId(v),
    wizardName: pickWizardName(v),
    country: v.country,
    channelUid: pickChannelUid(v),
  }), []);

  const goPlayer = useCallback(
    (wizardId: string) => {
      if (!wizardId) return;
      prefetchRtaPlayerPageData(queryClient, wizardId, seasonSelectValue, seasonIdForApi);
      router.push(`/rta/player/${encodeURIComponent(wizardId)}`);
      onClose();
    },
    [router, onClose, queryClient, seasonSelectValue, seasonIdForApi],
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, bgcolor: '#1a1a2e', borderRadius: 2.5 }}>
      {/* 검색 입력 영역 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, pt: 1, pb: 0.5 }}>
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
            if (reason === 'reset' || reason === 'blur') return;
            setInput(v);
          }}
          onChange={handleSelect}
          value={null}
          blurOnSelect
          clearOnBlur={false}
          noOptionsText="결과 없음"
          sx={{ flex: 1 }}
          slotProps={{
            paper: {
              sx: {
                mt: 0.5,
                bgcolor: '#12122a',
                color: '#fff',
                backgroundImage: 'none',
                '& .MuiAutocomplete-option': { fontSize: '0.875rem' },
                '& .MuiAutocomplete-option:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                '& .MuiAutocomplete-option[aria-selected="true"]': { bgcolor: 'rgba(99,102,241,0.3)' },
              },
            },
          }}
          renderOption={(props, option) => {
            const { key, ...other } = props;
            const nm = pickWizardName(option);
            const ch = pickChannelUid(option);
            const flag = countryFlagSrc(option.country);
            return (
              <Box
                component="li"
                key={key}
                {...other}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, px: 1 }}
              >
                <Avatar src={getSwexPlayerImageUrl(ch)} alt="" sx={{ width: 28, height: 28, flexShrink: 0 }} />
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
              </Box>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              inputRef={inputRef}
              placeholder="소환사 이름으로 검색"
              aria-label="RTA 소환사 검색"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  bgcolor: 'rgba(255,255,255,0.07)',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                  '&.Mui-focused fieldset': { borderColor: 'rgba(255,255,255,0.6)' },
                },
                '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.4)', opacity: 1 },
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
                    {isFetching ? <CircularProgress size={16} sx={{ mr: 1, color: 'rgba(255,255,255,0.6)' }} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
        <IconButton size="small" onClick={onClose} aria-label="닫기" sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff' } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* 최근검색 / 즐겨찾기 패널 */}
      {inputEmpty && (
        <RtaSummonerSessionSearchPanel
          idPrefix="rta-sess-dlg"
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
  );
}

export default function RtaSummonerSearchDialog({ open, onClose }: RtaSummonerSearchDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        backdrop: { sx: { backdropFilter: 'blur(2px)' } },
      }}
      PaperProps={{
        sx: {
          borderRadius: 2.5,
          overflow: 'visible',
          m: { xs: 1.5, sm: 3 },
          bgcolor: '#1a1a2e',
          color: '#fff',
          backgroundImage: 'none',
        },
      }}
    >
      <DialogContent sx={{ p: 0, overflow: 'visible', bgcolor: 'transparent' }}>
        {open ? <SearchDialogContent onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}
