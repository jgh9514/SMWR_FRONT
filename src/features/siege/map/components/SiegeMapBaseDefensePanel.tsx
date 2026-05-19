'use client';

import {
  Alert,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useSiegeMapBaseDefense } from '@/features/siege/map/hooks/useSiegeMap';
import { formatRemainMmSs } from '@/features/siege/map/lib/formatSiegeMap';
import {
  formatSiegeBaseStatus,
  formatSiegeDeckStatus,
  siegeDeckStatusColor,
} from '@/features/siege/map/lib/siegeDefenseLabels';
import { getMonsterImageUrl } from '@/shared/utils/image';

type SiegeMapBaseDefensePanelProps = {
  open: boolean;
  onClose: () => void;
  matchId: string;
  baseNumber: number | null;
  snapshotId?: number | null;
};

function DeckRow({
  deck,
}: {
  deck: {
    deckId: number;
    wizardName?: string | null;
    wizardLevel?: number | null;
    deckStatus: number;
    winCount?: number | null;
    loseCount?: number | null;
    winningRate?: number | null;
    units: { posId: number; unitMasterId: number; unitLevel: number; krName?: string | null; imageUrl?: string | null }[];
  };
}) {
  const sortedUnits = [...deck.units].sort((a, b) => a.posId - b.posId);

  return (
    <Box
      sx={{
        p: 1.25,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
        <Typography variant="body2" fontWeight={700} sx={{ flex: 1, minWidth: 120 }}>
          {deck.wizardName?.trim() || `마법사 ${deck.deckId}`}
          {deck.wizardLevel != null && deck.wizardLevel > 0 ? (
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              Lv.{deck.wizardLevel}
            </Typography>
          ) : null}
        </Typography>
        <Chip
          size="small"
          label={formatSiegeDeckStatus(deck.deckStatus)}
          color={siegeDeckStatusColor(deck.deckStatus)}
          variant="outlined"
        />
        <Typography variant="caption" color="text.secondary">
          {deck.winCount ?? 0}승 {deck.loseCount ?? 0}패
          {deck.winningRate != null ? ` · ${Number(deck.winningRate).toFixed(0)}%` : ''}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1}>
        {sortedUnits.map((u) => (
          <Box key={`${deck.deckId}-${u.posId}`} sx={{ textAlign: 'center', width: 72 }}>
            <Avatar
              src={u.imageUrl ? getMonsterImageUrl(u.imageUrl) : getMonsterImageUrl(null)}
              alt={u.krName ?? String(u.unitMasterId)}
              variant="rounded"
              sx={{ width: 56, height: 56, mx: 'auto', bgcolor: 'action.hover' }}
            />
            <Typography variant="caption" display="block" noWrap title={u.krName ?? undefined}>
              {u.krName ?? u.unitMasterId}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Lv.{u.unitLevel || '—'}
            </Typography>
          </Box>
        ))}
        {sortedUnits.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            유닛 정보 없음
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

export default function SiegeMapBaseDefensePanel({
  open,
  onClose,
  matchId,
  baseNumber,
  snapshotId,
}: SiegeMapBaseDefensePanelProps) {
  const defenseQuery = useSiegeMapBaseDefense(matchId, baseNumber, snapshotId, open);
  const data = defenseQuery.data;
  const remain = formatRemainMmSs(data?.remainSec);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 400 }, maxWidth: '100%' } } }}
    >
      <Stack sx={{ height: '100%' }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}
        >
          <Typography variant="h6" sx={{ flex: 1 }}>
            거점 {baseNumber ?? '—'}
          </Typography>
          <IconButton onClick={onClose} aria-label="닫기" edge="end">
            <CloseIcon />
          </IconButton>
        </Stack>

        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {defenseQuery.isLoading && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={32} />
            </Box>
          )}

          {defenseQuery.isError && (
            <Alert severity="error">방덱 정보를 불러오지 못했습니다.</Alert>
          )}

          {data && !defenseQuery.isLoading && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                  label={`거점 ${formatSiegeBaseStatus(data.baseStatus)}`}
                  color={data.baseStatus === 1 ? 'warning' : data.baseStatus === 2 ? 'error' : 'default'}
                />
                {remain && <Chip size="small" label={`남은 ${remain}`} color="warning" variant="outlined" />}
                {data.capturedAt != null && (
                  <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                    방덱 수집 {new Date(data.capturedAt * 1000).toLocaleString('ko-KR')}
                  </Typography>
                )}
              </Stack>

              {data.decks.length === 0 ? (
                <Alert severity="info">
                  이 거점의 방덱 스냅샷이 없습니다. 수집기에서 GetGuildSiegeBaseDefenseUnitList 적재 후 표시됩니다.
                </Alert>
              ) : (
                data.decks.map((deck) => <DeckRow key={deck.deckId} deck={deck} />)
              )}
            </Stack>
          )}
        </Box>
      </Stack>
    </Drawer>
  );
}
