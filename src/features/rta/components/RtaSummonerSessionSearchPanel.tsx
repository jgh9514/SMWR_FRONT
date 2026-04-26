'use client';

import { Box, Typography } from '@mui/material';
import RtaSummonerSessionSearchRow from './RtaSummonerSessionSearchRow';
import type { RtaSummonerSessionBookmark } from '@/features/rta/lib/rtaSummonerSessionSearchStorage';

type Entry = Omit<RtaSummonerSessionBookmark, 'updatedAt'>;

export type RtaSummonerSessionSearchPanelProps = {
  /** 홈/헤더 동시 마운트 시 id 중복 방지 (예: rta-sess-home, rta-sess-hdr) */
  idPrefix: string;
  sessionListTab: number;
  onSessionListTabChange: (index: number) => void;
  favoriteListLength: number;
  sessionFilteredRecent: RtaSummonerSessionBookmark[];
  sessionFilteredFav: RtaSummonerSessionBookmark[];
  hasSessionFilter: boolean;
  isFavorite: (wizardId: string) => boolean;
  onOpenBookmark: (b: Entry) => void;
  onToggleFavorite: (b: Entry) => void;
  onRemoveRecent: (wizardId: string) => void;
  /**
   * home: 검색 박스 하단 absolute(레이아웃 밀지 않음, 세션 패널 z-index) —
   * header: 우측 정렬 `dropdown`과 동일 absolute.
   */
  layout: 'inline' | 'dropdown';
};

/**
 * sessionStorage 기반 최근검색·즐겨찾기 (react-tabs 유사 DOM).
 */
export default function RtaSummonerSessionSearchPanel({
  idPrefix,
  sessionListTab,
  onSessionListTabChange,
  favoriteListLength,
  sessionFilteredRecent,
  sessionFilteredFav,
  hasSessionFilter,
  isFavorite,
  onOpenBookmark,
  onToggleFavorite,
  onRemoveRecent,
  layout,
}: RtaSummonerSessionSearchPanelProps) {
  const t0 = `${idPrefix}-tab-0`;
  const t1 = `${idPrefix}-tab-1`;
  const p0 = `${idPrefix}-panel-0`;
  const p1 = `${idPrefix}-panel-1`;

  return (
    <Box
      className="react-tabs home-summoner-session-panel"
      data-rttabs="true"
      onMouseDown={(e) => {
        const el = e.target as HTMLElement;
        if (el.closest('button, a[href], [role="tab"]')) {
          return;
        }
        e.preventDefault();
      }}
      sx={
        layout === 'dropdown'
          ? {
              position: 'absolute',
              top: '100%',
              right: 0,
              mt: 0.5,
              width: { xs: 'min(calc(100vw - 24px), 360px)', sm: 360 },
              zIndex: (theme) => theme.zIndex.modal,
              textAlign: 'left',
              borderRadius: 1,
              bgcolor: 'rgba(8, 15, 30, 0.96)',
              border: '1px solid rgba(255,255,255,0.12)',
              overflow: 'hidden',
              boxShadow: 6,
            }
          : {
              position: 'absolute',
              left: 0,
              right: 0,
              top: '100%',
              mt: 0.5,
              zIndex: (theme) => theme.zIndex.modal,
              textAlign: 'left',
              borderRadius: 1,
              bgcolor: 'rgba(8, 15, 30, 0.96)',
              border: '1px solid rgba(255,255,255,0.12)',
              overflow: 'hidden',
              boxShadow: 6,
            }
      }
    >
      <Box
        component="ul"
        className="react-tabs__tab-list"
        role="tablist"
        aria-label="최근검색 및 즐겨찾기"
        sx={{
          display: 'flex',
          listStyle: 'none',
          m: 0,
          p: 0,
          minHeight: 40,
          bgcolor: 'rgba(0,0,0,0.28)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Box
          component="li"
          role="tab"
          className={sessionListTab === 0 ? 'react-tabs__tab react-tabs__tab--selected' : 'react-tabs__tab'}
          id={t0}
          tabIndex={sessionListTab === 0 ? 0 : -1}
          aria-selected={sessionListTab === 0}
          aria-disabled={false}
          aria-controls={p0}
          onClick={() => onSessionListTabChange(0)}
          onMouseDown={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSessionListTabChange(0);
            }
          }}
          data-rttab="true"
          sx={{
            flex: 1,
            textAlign: 'center',
            py: 1,
            fontSize: '0.8125rem',
            fontWeight: 700,
            cursor: 'pointer',
            color: sessionListTab === 0 ? 'rgba(255,255,255,0.98) !important' : 'rgba(255,255,255,0.55)',
            borderBottom: sessionListTab === 0 ? '2px solid' : '2px solid transparent',
            borderColor: 'primary.main',
          }}
        >
          최근검색
        </Box>
        <Box
          component="li"
          role="tab"
          className={sessionListTab === 1 ? 'react-tabs__tab react-tabs__tab--selected' : 'react-tabs__tab'}
          id={t1}
          tabIndex={sessionListTab === 1 ? 0 : -1}
          aria-selected={sessionListTab === 1}
          aria-disabled={false}
          aria-controls={p1}
          onClick={() => onSessionListTabChange(1)}
          onMouseDown={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSessionListTabChange(1);
            }
          }}
          data-rttab="true"
          sx={{
            flex: 1,
            textAlign: 'center',
            py: 1,
            fontSize: '0.8125rem',
            fontWeight: 700,
            cursor: 'pointer',
            color: sessionListTab === 1 ? 'rgba(255,255,255,0.98) !important' : 'rgba(255,255,255,0.55)',
            borderBottom: sessionListTab === 1 ? '2px solid' : '2px solid transparent',
            borderColor: 'primary.main',
          }}
        >
          {favoriteListLength > 0 ? `즐겨찾기 (${favoriteListLength})` : '즐겨찾기'}
        </Box>
      </Box>

      <Box
        id={p0}
        className={sessionListTab === 0 ? 'react-tabs__tab-panel react-tabs__tab-panel--selected' : 'react-tabs__tab-panel'}
        role="tabpanel"
        aria-labelledby={t0}
        hidden={sessionListTab !== 0}
        sx={{ maxHeight: 240, overflowY: 'auto' }}
      >
        <Box className="searchListContainer" sx={{ py: 0.5 }}>
          {sessionFilteredRecent.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', py: 2, px: 1.5, textAlign: 'center' }}>
              {hasSessionFilter ? '일치하는 최근 검색이 없습니다.' : '최근 검색한 소환사가 없습니다.'}
            </Typography>
          ) : (
            <Box component="ul" className="search_list" sx={{ listStyle: 'none', m: 0, p: 0, px: 0.5 }}>
              {sessionFilteredRecent.map((b) => {
                const entry: Entry = {
                  wizardId: b.wizardId,
                  wizardName: b.wizardName,
                  channelUid: b.channelUid,
                  country: b.country,
                };
                return (
                  <RtaSummonerSessionSearchRow
                    key={b.wizardId}
                    b={b}
                    isFavorite={isFavorite(b.wizardId)}
                    onOpen={(e) => {
                      e.preventDefault();
                      onOpenBookmark(entry);
                    }}
                    onBookmark={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(entry);
                    }}
                    onRemove={(e) => {
                      e.stopPropagation();
                      onRemoveRecent(b.wizardId);
                    }}
                  />
                );
              })}
            </Box>
          )}
        </Box>
      </Box>

      <Box
        id={p1}
        className={sessionListTab === 1 ? 'react-tabs__tab-panel react-tabs__tab-panel--selected' : 'react-tabs__tab-panel'}
        role="tabpanel"
        aria-labelledby={t1}
        hidden={sessionListTab !== 1}
        sx={{ maxHeight: 240, overflowY: 'auto' }}
      >
        <Box className="searchListContainer" sx={{ py: 0.5 }}>
          {sessionFilteredFav.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', py: 2, px: 1.5, textAlign: 'center' }}>
              {hasSessionFilter
                ? '일치하는 즐겨찾기가 없습니다.'
                : '즐겨찾기에 추가한 소환사가 없습니다. 최근검색 또는 검색 결과에서 별(☆)을 눌러 보세요.'}
            </Typography>
          ) : (
            <Box component="ul" className="search_list" sx={{ listStyle: 'none', m: 0, p: 0, px: 0.5 }}>
              {sessionFilteredFav.map((b) => {
                const entry: Entry = {
                  wizardId: b.wizardId,
                  wizardName: b.wizardName,
                  channelUid: b.channelUid,
                  country: b.country,
                };
                return (
                  <RtaSummonerSessionSearchRow
                    key={b.wizardId}
                    b={b}
                    isFavorite
                    showBookmark={false}
                    onOpen={(e) => {
                      e.preventDefault();
                      onOpenBookmark(entry);
                    }}
                    onRemove={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(entry);
                    }}
                  />
                );
              })}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
