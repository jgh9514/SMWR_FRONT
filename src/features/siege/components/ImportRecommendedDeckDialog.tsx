'use client';

import { useMemo, useState } from 'react';
import {
  Avatar,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import type { ImportableRecommendedDeckItem } from '@/features/siege/types/siegeDetail';
import { useImportableRecommendedDecks, useMonsterList, type MonsterOption } from '@/features/siege/hooks/useSiegeList';
import { apiClient } from '@/shared/lib/api/client';
import { showToast } from '@/shared/lib/notification';
import { getMonsterImageUrl } from '@/shared/utils/image';
import { buildDeckFormStateFromDetail, type DeckFormImportState } from '@/features/siege/utils/deckDetailForm';

interface ImportRecommendedDeckDialogProps {
  open: boolean;
  onClose: () => void;
  defenseMonster?: { dm1: string; dm2: string; dm3: string } | null;
  onImport: (state: DeckFormImportState) => void;
}

function formatDeckLabel(defNames: Array<string | undefined>, atkNames: Array<string | undefined>): string {
  const def = defNames.filter(Boolean).join(' / ') || '-';
  const atk = atkNames.filter(Boolean).join(' / ') || '-';
  return `방: ${def} → 공: ${atk}`;
}

export default function ImportRecommendedDeckDialog({
  open,
  onClose,
  defenseMonster,
  onImport,
}: ImportRecommendedDeckDialogProps) {
  const pageSize = 15;
  const [page, setPage] = useState(1);
  const [selectedMonster, setSelectedMonster] = useState<MonsterOption | null>(null);
  const [appliedMonsterId, setAppliedMonsterId] = useState<string | undefined>(undefined);
  const [loadingDeckId, setLoadingDeckId] = useState<string | null>(null);
  const { data: monsterList = [] } = useMonsterList(undefined, { enabled: open });

  const queryParams = useMemo(
    () => ({
      paging: pageSize,
      offset: page,
      ...(defenseMonster?.dm1 && defenseMonster?.dm2 && defenseMonster?.dm3
        ? {
            exclude_def_monster_1: defenseMonster.dm1,
            exclude_def_monster_2: defenseMonster.dm2,
            exclude_def_monster_3: defenseMonster.dm3,
          }
        : {}),
      ...(appliedMonsterId ? { monster_id: appliedMonsterId } : {}),
    }),
    [appliedMonsterId, defenseMonster, page],
  );

  const decksQuery = useImportableRecommendedDecks(queryParams, open);
  const deckList = decksQuery.data?.deckList ?? [];
  const totalCount = decksQuery.data?.totalCount ?? 0;
  const hasNext = decksQuery.data?.hasNext ?? false;

  const handleClose = () => {
    setPage(1);
    setSelectedMonster(null);
    setAppliedMonsterId(undefined);
    setLoadingDeckId(null);
    onClose();
  };

  const applySearch = () => {
    setAppliedMonsterId(selectedMonster?.monster_id);
    setPage(1);
  };

  const handleImport = async (item: ImportableRecommendedDeckItem) => {
    const deckId = item.deck_id != null ? String(item.deck_id) : '';
    if (!deckId) {
      return;
    }
    setLoadingDeckId(deckId);
    try {
      const detail = await apiClient.post<Record<string, unknown>>('/summonerswar/deck-detail', {
        deck_id: deckId,
      });
      const formState = buildDeckFormStateFromDetail(detail, monsterList);
      if (!formState) {
        throw new Error('공덱 정보를 불러올 수 없습니다.');
      }
      onImport(formState);
      handleClose();
    } catch {
      // toast는 상위에서 처리
      throw new Error('공덱 불러오기에 실패했습니다.');
    } finally {
      setLoadingDeckId(null);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth sx={{ zIndex: (t) => t.zIndex.modal + 30 }}>
      <DialogTitle sx={{ pr: 6 }}>
        공덱 불러오기
        <IconButton
          aria-label="닫기"
          onClick={handleClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          다른 방덱에 등록된 추천 공덱의 몬스터·스탯·턴 순서·코멘트를 가져옵니다. 타겟팅 순서는 현재 방덱 기준으로 유지됩니다.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Autocomplete
            sx={{ flex: 1 }}
            options={monsterList}
            value={selectedMonster}
            onChange={(_, value) => setSelectedMonster(value)}
            isOptionEqualToValue={(option, value) => option.monster_id === value.monster_id}
            getOptionLabel={(option) => `${option.kr_name} (${option.monster_id})`}
            renderInput={(params) => <TextField {...params} label="몬스터 검색" size="small" />}
          />
          <Button variant="outlined" onClick={applySearch}>
            조회
          </Button>
        </Box>

        {decksQuery.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : deckList.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            불러올 수 있는 추천 공덱이 없습니다.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, maxHeight: 420, overflowY: 'auto' }}>
            {deckList.map((item) => {
              const rowKey = String(item.deck_id);
              const defNames = [item.def_m1_kr_name, item.def_m2_kr_name, item.def_m3_kr_name];
              const atkNames = [item.atk_m1_kr_name, item.atk_m2_kr_name, item.atk_m3_kr_name];
              const isLoading = loadingDeckId === rowKey;
              return (
                <Paper key={rowKey} variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                    {formatDeckLabel(defNames, atkNames)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ display: 'flex' }}>
                      {[item.atk_image_url1, item.atk_image_url2, item.atk_image_url3]
                        .filter(Boolean)
                        .map((url, idx) => (
                          <Avatar
                            key={`${rowKey}-${idx}`}
                            src={url ? getMonsterImageUrl(url) : undefined}
                            sx={{
                              width: 34,
                              height: 34,
                              ml: idx > 0 ? -0.75 : 0,
                              border: '1px solid',
                              borderColor: 'divider',
                            }}
                          />
                        ))}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {item.deck_comment_preview ? (
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {item.deck_comment_preview}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.disabled">
                          코멘트 없음
                        </Typography>
                      )}
                    </Box>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={isLoading ? <CircularProgress size={14} color="inherit" /> : <FileDownloadOutlinedIcon />}
                      disabled={isLoading || loadingDeckId != null}
                      onClick={() => {
                        void handleImport(item).catch(() => {
                          showToast.error('공덱 불러오기에 실패했습니다.');
                        });
                      }}
                    >
                      불러오기
                    </Button>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        )}

        {deckList.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, mt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              disabled={page <= 1 || decksQuery.isFetching}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              이전
            </Button>
            <Typography variant="body2">
              {page} 페이지 / 총 {totalCount.toLocaleString('ko-KR')}건
            </Typography>
            <Button
              variant="outlined"
              size="small"
              disabled={!hasNext || decksQuery.isFetching}
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
