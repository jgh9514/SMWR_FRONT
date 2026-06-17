'use client';

import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { PopularAttackDeckComboItem, RecordAttackDeckDefenseMatchup } from '@/features/siege/types/siegeDetail';
import { useRecordAttackDeckDefenseMatchups } from '@/features/siege/hooks/useSiegeList';
import { getMonsterImageUrl } from '@/shared/utils/image';
import { useMemo, useState } from 'react';

function formatMatchupStat(item: RecordAttackDeckDefenseMatchup): string {
  const usage = Number(item.usage_count ?? 0);
  const winCount = Number(item.win_count ?? 0);
  const loseCount = Number(item.lose_count ?? 0);
  const total = winCount + loseCount;
  const winRate = total > 0 ? Math.round((winCount / total) * 100) : 0;
  return `사용 ${usage.toLocaleString('ko-KR')}회 · 승률 ${winRate}%`;
}

function MonsterAvatarRow({
  imageUrls,
  names,
  ids,
  rowKey,
}: {
  imageUrls: (string | undefined)[];
  names: (string | undefined)[];
  ids: (string | undefined)[];
  rowKey: string;
}) {
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.75 }}>
        {imageUrls.map((url, idx) => (
          <Avatar
            key={`${rowKey}-img-${idx}`}
            src={url ? getMonsterImageUrl(url) : undefined}
            sx={{
              width: 40,
              height: 40,
              ml: idx > 0 ? -1 : 0,
              border: '2px solid',
              borderColor: 'primary.main',
              bgcolor: 'background.paper',
              '& img': { objectFit: 'contain' },
            }}
          />
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
        {names.map((name, idx) => name || ids[idx] || '-').join(' · ')}
      </Typography>
    </>
  );
}

interface RecordAttackDeckMatchupDialogProps {
  open: boolean;
  onClose: () => void;
  attackCombo: PopularAttackDeckComboItem | null;
}

export default function RecordAttackDeckMatchupDialog({
  open,
  onClose,
  attackCombo,
}: RecordAttackDeckMatchupDialogProps) {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const queryParams = useMemo(() => {
    if (!attackCombo?.atk_monster_1 || !attackCombo?.atk_monster_2 || !attackCombo?.atk_monster_3) {
      return null;
    }
    return {
      atk_monster_1: String(attackCombo.atk_monster_1),
      atk_monster_2: String(attackCombo.atk_monster_2),
      atk_monster_3: String(attackCombo.atk_monster_3),
      paging: pageSize,
      offset: page,
    };
  }, [attackCombo, page]);

  const matchupQuery = useRecordAttackDeckDefenseMatchups(queryParams, open);
  const matchupList = matchupQuery.data?.matchupList ?? [];
  const totalCount = matchupQuery.data?.totalCount ?? 0;
  const hasNext = matchupQuery.data?.hasNext ?? false;

  const handleClose = () => {
    setPage(1);
    onClose();
  };

  const attackKey = attackCombo
    ? `${attackCombo.atk_monster_1}-${attackCombo.atk_monster_2}-${attackCombo.atk_monster_3}`
    : 'attack';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        전적 공덱 — 사용된 방덱
        <IconButton
          aria-label="닫기"
          onClick={handleClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {attackCombo && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
              공격 조합
            </Typography>
            <MonsterAvatarRow
              rowKey={`${attackKey}-atk`}
              imageUrls={[attackCombo.image_url1, attackCombo.image_url2, attackCombo.image_url3]}
              names={[attackCombo.m1_kr_name, attackCombo.m2_kr_name, attackCombo.m3_kr_name]}
              ids={[attackCombo.atk_monster_1, attackCombo.atk_monster_2, attackCombo.atk_monster_3]}
            />
            <Typography variant="body2" color="primary.main" sx={{ mt: 1, textAlign: 'center', fontWeight: 700 }}>
              {formatMatchupStat(attackCombo)}
            </Typography>
          </Paper>
        )}

        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
          상대 방덱 ({totalCount.toLocaleString('ko-KR')}종)
        </Typography>

        {matchupQuery.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : matchupQuery.isError ? (
          <Typography color="error.main" sx={{ py: 2, textAlign: 'center' }}>
            방덱 목록을 불러오지 못했습니다.
          </Typography>
        ) : matchupList.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            사용 기록이 있는 방덱이 없습니다.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, maxHeight: 420, overflowY: 'auto' }}>
            {matchupList.map((item) => {
              const rowKey = `${item.def_monster_1}-${item.def_monster_2}-${item.def_monster_3}`;
              return (
                <Paper key={rowKey} variant="outlined" sx={{ p: 1.5 }}>
                  <MonsterAvatarRow
                    rowKey={rowKey}
                    imageUrls={[item.image_url1, item.image_url2, item.image_url3]}
                    names={[item.d1_kr_name, item.d2_kr_name, item.d3_kr_name]}
                    ids={[item.def_monster_1, item.def_monster_2, item.def_monster_3]}
                  />
                  <Typography
                    variant="body2"
                    sx={{ mt: 1, textAlign: 'center', fontWeight: 600, color: 'text.primary' }}
                  >
                    {formatMatchupStat(item)}
                  </Typography>
                </Paper>
              );
            })}
          </Box>
        )}

        {matchupList.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, mt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              disabled={page <= 1 || matchupQuery.isFetching}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              이전
            </Button>
            <Typography variant="body2">{page} 페이지</Typography>
            <Button
              variant="outlined"
              size="small"
              disabled={!hasNext || matchupQuery.isFetching}
              onClick={() => setPage((prev) => prev + 1)}
            >
              다음
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
