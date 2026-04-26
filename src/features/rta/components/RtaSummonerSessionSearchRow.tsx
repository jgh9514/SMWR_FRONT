'use client';

import { Avatar, Box, IconButton, Typography } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import CloseIcon from '@mui/icons-material/Close';
import { getSwexPlayerImageUrl } from '@/shared/utils/image';
import type { RtaSummonerSessionBookmark } from '@/features/rta/lib/rtaSummonerSessionSearchStorage';

const visuallyHiddenSx = {
  position: 'absolute' as const,
  width: 1,
  height: 1,
  p: 0,
  m: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap' as const,
  border: 0,
};

/** react-tabs 스타일 목록 한 줄: 썸네일 · common_search + #위자드ID · 즐겨찾기 · 제거(X) */
export default function RtaSummonerSessionSearchRow({
  b,
  isFavorite: fav,
  showBookmark = true,
  onOpen,
  onBookmark,
  onRemove,
}: {
  b: RtaSummonerSessionBookmark;
  isFavorite: boolean;
  /** false: 즐겨찾기 탭 — X(제거)만 표시 */
  showBookmark?: boolean;
  onOpen: (e: React.MouseEvent) => void;
  onBookmark?: (e: React.MouseEvent) => void;
  onRemove: (e: React.MouseEvent) => void;
}) {
  const ch = b.channelUid;
  const wid = b.wizardId;
  return (
    <Box
      component="li"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        py: 0.9,
        px: 0.5,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      <Box
        className="sessionRowEmblem"
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: 0.5,
          overflow: 'hidden',
          bgcolor: 'rgba(0,0,0,0.35)',
        }}
      >
        <Avatar
          src={getSwexPlayerImageUrl(ch ?? wid)}
          alt=""
          variant="rounded"
          sx={{ width: 40, height: 40, fontSize: 11, fontWeight: 700, borderRadius: 0.5 }}
        />
      </Box>
      <Typography
        component="p"
        className="txt"
        sx={{
          flex: 1,
          minWidth: 0,
          m: 0,
          lineHeight: 1.35,
        }}
      >
        <Box
          component="a"
          className="common_search"
          href={`/rta/player/${encodeURIComponent(wid)}`}
          onClick={onOpen}
          onMouseDown={(e) => e.preventDefault()}
          sx={{
            color: 'rgba(255,255,255,0.95)',
            textDecoration: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
            display: 'inline',
            maxWidth: '100%',
            wordBreak: 'break-word',
            '&:hover': { textDecoration: 'underline', color: 'common.white' },
            '& .hashSuffix': {
              color: 'rgba(255,255,255,0.45)',
              fontWeight: 500,
              fontSize: '0.75rem',
              ml: 0.25,
            },
          }}
        >
          {b.wizardName}
          <Box component="span" className="hashSuffix">
            #{wid}
          </Box>
        </Box>
      </Typography>
      {showBookmark ? (
        <Box
          component="button"
          type="button"
          className={fav ? 'bookmark on' : 'bookmark off'}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onBookmark?.(e);
          }}
          sx={{
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 36,
            p: 0.25,
            border: 0,
            borderRadius: 0.5,
            bgcolor: 'transparent',
            color: fav ? 'warning.light' : 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            fontSize: 11,
            lineHeight: 1,
            '&:hover': { color: 'common.white' },
          }}
        >
          {fav ? <StarIcon sx={{ fontSize: 20 }} /> : <StarBorderIcon sx={{ fontSize: 20 }} />}
          <Box component="span" sx={visuallyHiddenSx}>
            즐겨찾기
          </Box>
        </Box>
      ) : null}
      <IconButton
        type="button"
        className="remove"
        size="small"
        aria-label="목록에서 제거"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(e);
        }}
        sx={{
          flexShrink: 0,
          p: 0.5,
          color: 'rgba(255,255,255,0.55)',
          borderRadius: 0.5,
          '&:hover': { color: 'rgba(255,255,255,0.95)', bgcolor: 'rgba(255,255,255,0.1)' },
        }}
      >
        <CloseIcon sx={{ fontSize: 20 }} />
      </IconButton>
    </Box>
  );
}
