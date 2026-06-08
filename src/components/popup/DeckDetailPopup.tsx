'use client';

import { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Box,
  Avatar,
  Chip,
  Skeleton,
  IconButton,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningIcon from '@mui/icons-material/Warning';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import {
  useDeckDetail,
  useDeleteDeck,
  isDeckDeleteSuccess,
  type DeleteDeckPayload,
  useDeckVoteMutation,
  useApiPostMutation,
  type DeckDetailQueryParams,
} from '@/hooks/api';
import { showToast, confirm } from '@/shared/lib/notification';
import { getMonsterImageUrl } from '@/shared/utils/image';
import RuneSetPicker from '@/features/siege/components/RuneSetPicker';
import RuneIconRow from '@/features/siege/components/RuneIconRow';
import { useRuneMasterList } from '@/features/siege/hooks/useRuneMaster';
import { runeSelectionErrorMessage, selectionFromDeckMonsterStats } from '@/features/siege/utils/runeValidation';
import { extractRuneDisplaysFromDetail, extractRuneSelectionFromDetail } from '@/features/siege/utils/runeDetail';
import type { RecommendedItem } from '@/features/siege/types/siegeDetail';
import {
  createEmptyDeckMonsterStats,
  type DeckEditableStatKey,
  type DeckMonsterStats,
} from '@/features/siege/types/siege';
import type { DeckMonsterRuneSelection } from '@/features/siege/types/rune';
import {
  buildDeckDetailQueryParams,
  pickDeckStat,
  resolveAtkMonsters,
  resolveDefMonsters,
  resolveDeckId,
  resolveMonsterImageUrl,
  resolveMonsterKrName,
} from '@/features/siege/utils/deckRecord';

type DeckDetailRecord = Record<string, unknown>;

const createInitialDeckStats = (): DeckMonsterStats[] => [
  createEmptyDeckMonsterStats(),
  createEmptyDeckMonsterStats(),
  createEmptyDeckMonsterStats(),
];

function pickDeckNumeric(r: DeckDetailRecord | null | undefined, ...keys: string[]): number {
  if (!r) return 0;
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v !== null && v !== '') {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}

function pickDeckMyVote(r: DeckDetailRecord | null | undefined): string {
  if (!r) return '';
  const a = r.my_vote ?? r.myVote ?? r.myvote;
  return a != null ? String(a).trim().toUpperCase() : '';
}

const normalizeStatValue = (value: unknown, defaultValue = 0): number => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  const numValue = Number(value);
  return isNaN(numValue) ? defaultValue : numValue;
};

const STAT_ROWS: { key: DeckEditableStatKey; label: string; suffix?: string }[] = [
  { key: 'hp', label: '체력' },
  { key: 'atk', label: '공격력' },
  { key: 'def', label: '방어력' },
  { key: 'spd', label: '공격속도' },
  { key: 'critRate', label: '치명타 확률', suffix: '%' },
  { key: 'critDmg', label: '치명타 피해', suffix: '%' },
  { key: 'resistance', label: '효과 저항', suffix: '%' },
  { key: 'accuracy', label: '효과 적중', suffix: '%' },
];

interface DeckDetailPopupProps {
  open: boolean;
  onClose: () => void;
  onDeleted?: (deckId: string) => void;
  selectedItem?: RecommendedItem | null;
  /** 목록 행에 def_monster가 없을 때 상세 조회용 */
  defenseMonsters?: { dm1: string; dm2: string; dm3: string };
}

export default function DeckDetailPopup({ open, onClose, onDeleted, selectedItem, defenseMonsters }: DeckDetailPopupProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [lastSelectedItem, setLastSelectedItem] = useState<RecommendedItem | null>(null);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<number[]>([0, 1, 2]);
  const [editStats, setEditStats] = useState<DeckMonsterStats[]>(createInitialDeckStats);
  const { runeById } = useRuneMasterList();

  const activeItem = selectedItem ?? lastSelectedItem;

  const deckParams = useMemo((): DeckDetailQueryParams | null => {
    if (!open || !activeItem) return null;
    return buildDeckDetailQueryParams(
      activeItem as DeckDetailRecord,
      defenseMonsters
        ? { dm1: defenseMonsters.dm1, dm2: defenseMonsters.dm2, dm3: defenseMonsters.dm3 }
        : undefined,
    );
  }, [open, activeItem, defenseMonsters]);

  const {
    data: detailData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useDeckDetail(deckParams);

  const error = queryError ? (queryError instanceof Error ? queryError.message : '데이터를 불러오는데 실패했습니다.') : null;

  const detailDataRecord = detailData as DeckDetailRecord | null | undefined;

  const deckVoteMutation = useDeckVoteMutation({
    onSuccess: () => {
      showToast.success('투표가 반영되었습니다.');
      refetch();
    },
    onError: () => {
      showToast.error('투표 처리에 실패했습니다.');
    },
  });

  const deleteDeckMutation = useDeleteDeck({
    onSuccess: (res) => {
      if (isDeckDeleteSuccess(res)) {
        showToast.success('공덱이 삭제되었습니다.');
        const deletedId = resolveDeckId(lastSelectedItem as DeckDetailRecord)
          ?? resolveDeckId(detailDataRecord);
        if (deletedId && onDeleted) {
          onDeleted(deletedId);
        }
        handleClose();
      } else {
        showToast.error('공덱 삭제에 실패했습니다.');
      }
    },
    onError: (err) => {
      console.error('공덱 삭제 실패:', err);
      showToast.error('공덱 삭제 중 오류가 발생했습니다.');
    },
  });

  const validateParams = (target: RecommendedItem | DeckDetailRecord): DeleteDeckPayload => {
    const deckId = resolveDeckId(target as DeckDetailRecord);
    if (deckId) {
      return { deck_id: deckId };
    }
    const atk = resolveAtkMonsters(target as DeckDetailRecord);
    if (atk) {
      return atk;
    }
    throw new Error('deck_id 또는 공격 몬스터 조합이 필요합니다.');
  };

  const extractStatsFromDetail = useCallback((detail: DeckDetailRecord, index: 1 | 2 | 3): DeckMonsterStats => {
    const get = (key: string) => normalizeStatValue(pickDeckStat(detail, index, key), 0);
    const runes = extractRuneSelectionFromDetail(detail, index);
    return {
      hp: get('hp'),
      atk: get('atk'),
      def: get('def'),
      spd: get('spd'),
      critRate: get('crit_rate'),
      critDmg: get('crit_dmg'),
      resistance: get('resistance'),
      accuracy: get('accuracy'),
      runeId1: runes.runeId1,
      runeId2: runes.runeId2,
      runeId3: runes.runeId3,
    };
  }, []);

  const monsterImageUrls = (() => {
    const row = detailDataRecord ?? (activeItem as DeckDetailRecord | null);
    if (!row) return [null, null, null];
    return ([1, 2, 3] as const).map((i) => {
      const imageUrl = resolveMonsterImageUrl(row, i);
      return imageUrl ? getMonsterImageUrl(imageUrl) : null;
    });
  })();

  const monsterNames = (() => {
    const row = detailDataRecord ?? (activeItem as DeckDetailRecord | null);
    if (!row) return ['', '', ''];
    return ([1, 2, 3] as const).map((i) => resolveMonsterKrName(row, i));
  })();

  const monsterRuneDisplays = (() => {
    if (!detailDataRecord) return [[], [], []];
    return ([1, 2, 3] as const).map((i) => extractRuneDisplaysFromDetail(detailDataRecord, i));
  })();

  const hasValidData =
    monsterNames.some((n) => n !== '') ||
    monsterImageUrls.some((u) => u !== null) ||
    resolveDeckId(activeItem as DeckDetailRecord) != null;

  useEffect(() => {
    if (selectedItem) {
      setLastSelectedItem(selectedItem);
      setImageLoadErrors(new Set());
    }
  }, [selectedItem]);

  useEffect(() => {
    if (error) {
      showToast.error(error);
    }
  }, [error]);

  const handleClose = () => {
    setLastSelectedItem(null);
    setImageLoadErrors(new Set());
    setEditStats(createInitialDeckStats());
    setIsEditing(false);
    onClose();
  };

  const handleEditStatChange = (monsterIndex: number, key: DeckEditableStatKey, value: number) => {
    setEditStats((prev) =>
      prev.map((stats, index) =>
        index === monsterIndex ? { ...stats, [key]: value } : stats,
      ),
    );
  };

  const handleImageError = (imageUrl: string) => {
    setImageLoadErrors((prev) => new Set(prev).add(imageUrl));
  };

  const onDeleteClick = async () => {
    const target = lastSelectedItem || detailDataRecord;
    if (!target) {
      showToast.error('삭제할 공덱 정보가 없습니다.');
      return;
    }
    const res = await confirm('이 공덱을 삭제하시겠습니까?');
    if (!res) return;
    try {
      const params = validateParams(target);
      deleteDeckMutation.mutate(params);
    } catch (err) {
      console.error('공덱 삭제 실패:', err);
      showToast.error('공덱 삭제 중 오류가 발생했습니다.');
    }
  };

  const updateDeckMutation = useApiPostMutation<string, {
    deck_id: string;
    monster_1_stats: DeckMonsterStats;
    monster_2_stats: DeckMonsterStats;
    monster_3_stats: DeckMonsterStats;
  }>('/summonerswar/deck-detail-update', {
    onSuccess: (res) => {
      if (res === 'SUCCESS') {
        showToast.success('스탯이 수정되었습니다.');
        setIsEditing(false);
        refetch();
      } else {
        showToast.error('수정에 실패했습니다.');
      }
    },
    onError: (err) => {
      console.error('공덱 스탯 수정 실패:', err);
      showToast.error('수정 중 오류가 발생했습니다.');
    },
  });

  const onEditClick = () => {
    if (!detailDataRecord) return;
    setEditStats([
      extractStatsFromDetail(detailDataRecord, 1),
      extractStatsFromDetail(detailDataRecord, 2),
      extractStatsFromDetail(detailDataRecord, 3),
    ]);
    setExpandedPanel([0, 1, 2]);
    setIsEditing(true);
  };

  const onEditCancel = () => {
    setIsEditing(false);
  };

  const handleEditRuneChange = (monsterIndex: number, selection: DeckMonsterRuneSelection) => {
    setEditStats((prev) =>
      prev.map((stats, index) =>
        index === monsterIndex
          ? { ...stats, runeId1: selection.runeId1, runeId2: selection.runeId2, runeId3: selection.runeId3 }
          : stats,
      ),
    );
  };

  const onEditSave = () => {
    const target = lastSelectedItem || detailDataRecord;
    if (!target) {
      showToast.error('수정할 공덱 정보가 없습니다.');
      return;
    }
    for (let i = 0; i < editStats.length; i += 1) {
      const err = runeSelectionErrorMessage(selectionFromDeckMonsterStats(editStats[i]), runeById);
      if (err) {
        const name = detailDataRecord?.[`m${i + 1}_kr_name`];
        showToast.error(`${name ? String(name) : `몬스터 ${i + 1}`}: ${err}`);
        return;
      }
    }
    try {
      const deleteParams = validateParams(target);
      if (!('deck_id' in deleteParams)) {
        showToast.error('등록된 공덱만 수정할 수 있습니다.');
        return;
      }
      updateDeckMutation.mutate({
        deck_id: deleteParams.deck_id,
        monster_1_stats: editStats[0],
        monster_2_stats: editStats[1],
        monster_3_stats: editStats[2],
      });
    } catch (err) {
      console.error('공덱 스탯 수정 실패:', err);
      showToast.error('수정 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    if (!detailDataRecord) return;
    if (isEditing) return;
    setEditStats([
      extractStatsFromDetail(detailDataRecord, 1),
      extractStatsFromDetail(detailDataRecord, 2),
      extractStatsFromDetail(detailDataRecord, 3),
    ]);
  }, [detailDataRecord, extractStatsFromDetail, isEditing]);

  const isDark = theme.palette.mode === 'dark';
  const cardBg = isDark ? alpha('#78350F', 0.35) : alpha('#FEF3C7', 0.6);
  const cardHeaderBg = isDark ? alpha('#92400E', 0.5) : alpha('#FDE68A', 0.7);
  const cardBorder = isDark ? alpha('#B45309', 0.4) : alpha('#D97706', 0.3);
  const nameColor = isDark ? '#FCD34D' : '#92400E';
  const labelColor = isDark ? alpha('#FDE68A', 0.55) : '#A16207';
  const valueColor = isDark ? '#FDE68A' : '#78350F';
  const dividerColor = isDark ? alpha('#B45309', 0.3) : alpha('#D97706', 0.25);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      sx={{ zIndex: (t) => t.zIndex.modal + 20 }}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: theme.shadows[8],
          m: isMobile ? 0 : { xs: 1, sm: 2 },
          maxHeight: isMobile ? '100vh' : { xs: 'calc(100vh - 16px)', sm: 'calc(100vh - 48px)' },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="subtitle1" component="span" sx={{ fontWeight: 700 }}>
          공덱 상세
        </Typography>
        <IconButton onClick={handleClose} size="small" aria-label="닫기" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          p: { xs: 1.5, sm: 2 },
          pt: { xs: 2, sm: 2.25 },
          bgcolor: 'background.default',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Loading skeleton */}
        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, py: 2 }}>
              {[0, 1, 2].map((i) => (
                <Fragment key={i}>
                  {i > 0 && <Skeleton variant="circular" width={24} height={24} />}
                  <Skeleton variant="rounded" width={80} height={80} sx={{ borderRadius: 2 }} />
                </Fragment>
              ))}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} variant="rounded" height={240} sx={{ borderRadius: 2 }} />
              ))}
            </Box>
          </Box>
        )}

        {/* Error state */}
        {error && !loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, textAlign: 'center', px: 2 }}>
            <WarningIcon sx={{ fontSize: 64, color: 'error.main', mb: 2, opacity: 0.8 }} />
            <Typography color="error" variant="h6" sx={{ fontWeight: 600, mb: 1 }}>오류 발생</Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>{error}</Typography>
            <Button variant="contained" color="primary" onClick={() => refetch()} sx={{ borderRadius: 2 }}>다시 시도</Button>
          </Box>
        )}

        {/* Normal view */}
        {!loading && !error && detailDataRecord && hasValidData && !isEditing && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            {/* 공격 순서 */}
            <Box
              sx={{
                mt: 0.25,
                p: { xs: 1.5, sm: 2 },
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="caption"
                sx={{ display: 'block', mb: 1.75, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.6, textTransform: 'uppercase' }}
              >
                공격 순서
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: { xs: 1.25, sm: 2 },
                  flexWrap: 'nowrap',
                  overflowX: 'auto',
                  p: 0.75,
                  pb: 1,
                  borderRadius: 1.5,
                  bgcolor: (t) => alpha(t.palette.action.hover, 0.25),
                }}
              >
                {monsterImageUrls.map((imageUrl, index) => {
                  const name = monsterNames[index];
                  return (
                    <Fragment key={index}>
                      {index > 0 && (
                        <ChevronRightIcon sx={{ color: 'text.disabled', fontSize: { xs: 24, sm: 32 }, flexShrink: 0 }} />
                      )}
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, flexShrink: 0, minWidth: { xs: 72, sm: 88 } }}>
                        <Box sx={{ position: 'relative' }}>
                          {imageUrl && !imageLoadErrors.has(imageUrl) ? (
                            <Avatar
                              src={imageUrl}
                              alt={name || `몬스터 ${index + 1}`}
                              sx={{
                                width: { xs: 68, sm: 84 },
                                height: { xs: 68, sm: 84 },
                                borderRadius: 2,
                                border: '2px solid',
                                borderColor: index === 0 ? 'warning.main' : 'divider',
                                boxShadow: index === 0 ? `0 0 0 2px ${alpha(theme.palette.warning.main, 0.25)}` : 'none',
                              }}
                              onError={() => imageUrl && handleImageError(imageUrl)}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: { xs: 68, sm: 84 },
                                height: { xs: 68, sm: 84 },
                                borderRadius: 2,
                                bgcolor: 'action.hover',
                                border: '2px dashed',
                                borderColor: 'divider',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <BrokenImageIcon sx={{ color: 'text.disabled', fontSize: 28 }} />
                            </Box>
                          )}
                          {index === 0 && (
                            <Chip
                              label="L"
                              size="small"
                              color="warning"
                              sx={{
                                position: 'absolute',
                                top: 3,
                                left: 3,
                                height: 18,
                                minWidth: 18,
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                '& .MuiChip-label': { px: 0.5 },
                              }}
                            />
                          )}
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.secondary', fontWeight: 500, textAlign: 'center', maxWidth: 88, lineHeight: 1.2 }}
                          noWrap
                        >
                          {name || `몬스터 ${index + 1}`}
                        </Typography>
                      </Box>
                    </Fragment>
                  );
                })}
              </Box>
            </Box>

            {/* 투표 */}
            {detailDataRecord?.deck_id != null && (
              <Box
                sx={{
                  px: 2,
                  py: 1.25,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'stretch', sm: 'center' },
                  justifyContent: 'space-between',
                  gap: 1.5,
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  이 공덱 추천이 도움이 되었나요?
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {(() => {
                    const did = resolveDeckId(detailDataRecord);
                    const def = resolveDefMonsters(detailDataRecord);
                    const atk = resolveAtkMonsters(detailDataRecord);
                    const d1 = def?.def_monster_1 ?? '';
                    const d2 = def?.def_monster_2 ?? '';
                    const d3 = def?.def_monster_3 ?? '';
                    const a1 = atk?.atk_monster_1 ?? '';
                    const a2 = atk?.atk_monster_2 ?? '';
                    const a3 = atk?.atk_monster_3 ?? '';
                    const canVote = Boolean(did && d1 && d2 && d3);
                    const myV = pickDeckMyVote(detailDataRecord);
                    const upN = pickDeckNumeric(detailDataRecord, 'recommend_count', 'recommendCount', 'recommendcount');
                    const downN = pickDeckNumeric(detailDataRecord, 'not_recommend_count', 'notRecommendCount', 'notrecommendcount');
                    const busy = deckVoteMutation.isPending;
                    const send = (vote: 'UP' | 'DOWN' | 'CLEAR') => {
                      if (!did) return;
                      deckVoteMutation.mutate({
                        deck_id: did,
                        def_monster_1: d1,
                        def_monster_2: d2,
                        def_monster_3: d3,
                        ...(a1 !== '' && a2 !== '' && a3 !== '' ? { atk_monster_1: a1, atk_monster_2: a2, atk_monster_3: a3 } : {}),
                        vote,
                      });
                    };
                    return (
                      <>
                        <Button
                          size="small"
                          variant={myV === 'UP' ? 'contained' : 'outlined'}
                          color="primary"
                          startIcon={<ThumbUpIcon />}
                          onClick={() => send(myV === 'UP' ? 'CLEAR' : 'UP')}
                          disabled={busy || !canVote}
                        >
                          추천 {upN}
                        </Button>
                        <Button
                          size="small"
                          variant={myV === 'DOWN' ? 'contained' : 'outlined'}
                          color="error"
                          startIcon={<ThumbDownIcon />}
                          onClick={() => send(myV === 'DOWN' ? 'CLEAR' : 'DOWN')}
                          disabled={busy || !canVote}
                        >
                          비추천 {downN}
                        </Button>
                      </>
                    );
                  })()}
                </Box>
              </Box>
            )}

            {/* 룬 & 아티팩트 */}
            <Box>
              <Typography
                variant="caption"
                sx={{ display: 'block', mb: 1, fontWeight: 700, color: 'text.secondary', letterSpacing: 1, textTransform: 'uppercase' }}
              >
                룬 &amp; 아티팩트
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                  gap: 1.5,
                }}
              >
                {[0, 1, 2].map((i) => {
                  const idx = i + 1;
                  const name = monsterNames[i];
                  const imageUrl = monsterImageUrls[i];
                  const runeDisplays = monsterRuneDisplays[i];
                  const stats = editStats[i];
                  const hasImage = imageUrl && !imageLoadErrors.has(imageUrl);

                  return (
                    <Box
                      key={i}
                      sx={{
                        borderRadius: 2,
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: cardBorder,
                        bgcolor: cardBg,
                      }}
                    >
                      {/* Card header */}
                      <Box
                        sx={{
                          px: 1.5,
                          py: 1,
                          bgcolor: cardHeaderBg,
                          borderBottom: '1px solid',
                          borderColor: dividerColor,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, color: nameColor, flex: 1, lineHeight: 1.3 }}
                          noWrap
                        >
                          {name || `몬스터 ${idx}`}
                        </Typography>
                        {i === 0 && (
                          <Chip
                            label="리더"
                            size="small"
                            color="warning"
                            sx={{ height: 18, fontSize: '0.62rem', '& .MuiChip-label': { px: 0.75 } }}
                          />
                        )}
                      </Box>

                      {/* Rune set */}
                      <Box
                        sx={{
                          px: 1.5,
                          py: 0.75,
                          borderBottom: '1px solid',
                          borderColor: dividerColor,
                        }}
                      >
                        <RuneIconRow runes={runeDisplays} iconSize={26} />
                      </Box>

                      {/* Monster image + stats */}
                      <Box sx={{ p: 1.5, display: 'flex', gap: 1.25 }}>
                        <Box sx={{ flexShrink: 0 }}>
                          {hasImage ? (
                            <Avatar
                              src={imageUrl}
                              alt={name}
                              sx={{
                                width: { xs: 60, sm: 68 },
                                height: { xs: 60, sm: 68 },
                                borderRadius: 1.5,
                                border: '1px solid',
                                borderColor: cardBorder,
                              }}
                              onError={() => imageUrl && handleImageError(imageUrl)}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: { xs: 60, sm: 68 },
                                height: { xs: 60, sm: 68 },
                                borderRadius: 1.5,
                                bgcolor: 'action.hover',
                                border: '1px dashed',
                                borderColor: 'divider',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <BrokenImageIcon sx={{ color: 'text.disabled', fontSize: 22 }} />
                            </Box>
                          )}
                        </Box>

                        {/* Stats table */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          {STAT_ROWS.map((row) => (
                            <Box
                              key={row.key}
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                py: 0.2,
                              }}
                            >
                              <Typography variant="caption" sx={{ color: labelColor, fontSize: '0.68rem' }}>
                                {row.label}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: valueColor, fontWeight: 700, fontSize: '0.72rem', fontVariantNumeric: 'tabular-nums' }}
                              >
                                {stats[row.key] ?? 0}{row.suffix ?? ''}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        )}

        {/* Edit mode */}
        {!loading && !error && detailDataRecord && hasValidData && isEditing && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[1, 2, 3].map((idx) => {
              const index = idx - 1;
              const name = resolveMonsterKrName(detailDataRecord, idx as 1 | 2 | 3);
              const imageRaw = resolveMonsterImageUrl(detailDataRecord, idx as 1 | 2 | 3);
              const imageUrl = imageRaw ? getMonsterImageUrl(imageRaw) : null;
              return (
                <Accordion
                  key={idx}
                  expanded={expandedPanel.includes(index)}
                  onChange={(_, expanded) => {
                    setExpandedPanel((prev) => (expanded ? [...prev, index] : prev.filter((p) => p !== index)));
                  }}
                  disableGutters
                  elevation={0}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '8px !important',
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                    '&:before': { display: 'none' },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Avatar src={imageUrl ? getMonsterImageUrl(String(imageUrl)) : undefined} sx={{ width: 40, height: 40 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {name ? String(name) : `몬스터 ${idx}`}
                      </Typography>
                      {idx === 1 && <Chip label="리더" size="small" color="warning" sx={{ ml: 'auto', mr: 1 }} />}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      {STAT_ROWS.map((f) => (
                        <Box key={f.key} sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }}>
                          <TextField
                            label={f.label}
                            type="number"
                            value={editStats[index][f.key] ?? 0}
                            onChange={(e) => handleEditStatChange(index, f.key, Number(e.target.value))}
                            fullWidth
                            size="small"
                          />
                        </Box>
                      ))}
                    </Box>
                    <RuneSetPicker
                      value={selectionFromDeckMonsterStats(editStats[index])}
                      onChange={(selection) => handleEditRuneChange(index, selection)}
                    />
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        )}

        {/* No data */}
        {!loading && !error && (!detailDataRecord || !hasValidData) && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, textAlign: 'center', px: 2 }}>
            <InfoOutlinedIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
            <Typography color="text.secondary" variant="body1" sx={{ fontWeight: 500 }}>
              표시할 데이터가 없습니다.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 2,
          py: 1.5,
          gap: 1,
          flexWrap: 'wrap',
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        {!isEditing && (
          <Button
            color="error"
            variant="outlined"
            onClick={onDeleteClick}
            disabled={deleteDeckMutation.isPending}
            size="medium"
          >
            {deleteDeckMutation.isPending ? '삭제 중…' : '삭제'}
          </Button>
        )}
        <Box sx={{ flex: 1, minWidth: 8 }} />
        {!isEditing && (
          <Button
            color="primary"
            variant="outlined"
            onClick={onEditClick}
            disabled={loading || !!error || !detailDataRecord}
          >
            수정
          </Button>
        )}
        {isEditing && (
          <>
            <Button color="inherit" variant="text" onClick={onEditCancel} disabled={updateDeckMutation.isPending}>
              취소
            </Button>
            <Button color="primary" variant="contained" onClick={onEditSave} disabled={updateDeckMutation.isPending}>
              {updateDeckMutation.isPending ? '저장 중…' : '저장'}
            </Button>
          </>
        )}
        <Button color="primary" variant="text" onClick={handleClose}>
          닫기
        </Button>
      </DialogActions>
    </Dialog>
  );
}
