'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningIcon from '@mui/icons-material/Warning';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useDeckDetail, useDeleteDeck, useApiPostMutation } from '@/hooks/api';
import { showToast, confirm } from '@/shared/lib/notification';
import { getMonsterImageUrl } from '@/shared/utils/image';
import MonsterDetailCard from '@/features/siege/components/MonsterDetailCard';
import type { RecommendedItem } from '@/features/siege/types/siegeDetail';
import type { DeckMonsterStats, Monster } from '@/features/siege/types/siege';

type DeckDetailRecord = Record<string, unknown>;
type EditableStatKey = keyof DeckMonsterStats;

const createInitialDeckStats = (): DeckMonsterStats[] => [
  { hp: 0, atk: 0, def: 0, spd: 0, critRate: 0, critDmg: 0, resistance: 0, accuracy: 0 },
  { hp: 0, atk: 0, def: 0, spd: 0, critRate: 0, critDmg: 0, resistance: 0, accuracy: 0 },
  { hp: 0, atk: 0, def: 0, spd: 0, critRate: 0, critDmg: 0, resistance: 0, accuracy: 0 },
];

const normalizeStatValue = (value: unknown, defaultValue = 0): number => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  const numValue = Number(value);
  return isNaN(numValue) ? defaultValue : numValue;
};

interface DeckDetailPopupProps {
  open: boolean;
  onClose: () => void;
  onDeleted?: (deckId: string) => void;
  selectedItem?: RecommendedItem | null;
}

export default function DeckDetailPopup({ open, onClose, onDeleted, selectedItem }: DeckDetailPopupProps) {
  const theme = useTheme();
  const [lastSelectedItem, setLastSelectedItem] = useState<RecommendedItem | null>(null);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
  const [selectedMonsterIndex, setSelectedMonsterIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<number[]>([0, 1, 2]);
  const [editStats, setEditStats] = useState<DeckMonsterStats[]>(createInitialDeckStats);

  // 공덱 상세 조회 (React Query 사용)
  const deckParams = useMemo(() => {
    if (!lastSelectedItem) return null;
    
    // deck_id를 우선 사용하고, 없으면 team_id 사용
    const deckId = lastSelectedItem.deck_id || lastSelectedItem.team_id;
    if (!deckId) return null;
    
    return { deck_id: String(deckId) };
  }, [lastSelectedItem]);

  const {
    data: detailData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useDeckDetail(deckParams);

  const error = queryError ? (queryError instanceof Error ? queryError.message : '데이터를 불러오는데 실패했습니다.') : null;

  // detailData를 Record 타입으로 타입 단언
  const detailDataRecord = detailData as DeckDetailRecord | null | undefined;

  // 삭제 Mutation
  const deleteDeckMutation = useDeleteDeck({
    onSuccess: (res) => {
      if (res && res.result === 'SUCCESS') {
        showToast.success('공덱이 삭제되었습니다.');
        if (lastSelectedItem?.team_id && onDeleted) {
          onDeleted(String(lastSelectedItem.team_id));
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

  const validateParams = (target: RecommendedItem | DeckDetailRecord): { deck_id: string } => {
    const item = target as RecommendedItem;
    // deck_id를 우선 사용하고, 없으면 team_id 사용
    const deckId = item.deck_id || item.team_id;
    if (!deckId) {
      throw new Error('deck_id 또는 team_id가 필요합니다.');
    }
    return { deck_id: String(deckId) };
  };

  const extractStatsFromDetail = useCallback((detail: DeckDetailRecord, index: 1 | 2 | 3): DeckMonsterStats => {
    const get = (key: string) => normalizeStatValue(detail[`m${index}_${key}`], 0);
    return {
      hp: get('hp'),
      atk: get('atk'),
      def: get('def'),
      spd: get('spd'),
      critRate: get('crit_rate'),
      critDmg: get('crit_dmg'),
      resistance: get('resistance'),
      accuracy: get('accuracy'),
    };
  }, []);

  const monsterImageUrls = (() => {
    if (!detailDataRecord) return [];
    const urls: (string | null)[] = [];
    for (let i = 1; i <= 3; i++) {
      const imageUrl = detailDataRecord[`image_url${i}`];
      if (imageUrl) {
        urls.push(getMonsterImageUrl(String(imageUrl)));
      } else {
        urls.push(null);
      }
    }
    return urls;
  })();

  const monsterDetails = ((): Monster[] => {
    if (!detailDataRecord) return [];
    const monsters: Monster[] = [];

    for (let i = 1; i <= 3; i++) {
      const name = detailDataRecord[`m${i}_kr_name`];
      if (!name || String(name).trim() === '') continue;

      // 룬 정보는 백엔드에서 반환하지 않을 수 있으므로 기본값 사용
      const runeSet = detailDataRecord[`m${i}_rune_set`] || detailDataRecord.rune_set || '정보 없음';
      const rune2 = detailDataRecord[`m${i}_rune_2`] || detailDataRecord.rune_2 || '정보 없음';

      // 백엔드가 반환하는 필드명에 맞게 수정
      // 백엔드: m1_hp, m1_atk, m1_crit_rate, m1_crit_dmg, m1_resistance, m1_accuracy
      const getStat = (statName: string) => {
        // 백엔드 필드명 매핑
        const backendFieldMap: Record<string, string> = {
          hp: 'hp',
          atk: 'atk',
          def: 'def',
          spd: 'spd',
          cr: 'crit_rate',
          cd: 'crit_dmg',
          res: 'resistance',
          acc: 'accuracy',
        };
        
        const backendFieldName = backendFieldMap[statName] || statName;
        const statValue = normalizeStatValue(
          detailDataRecord[`m${i}_${backendFieldName}`],
          0,
        );
        
        // 백엔드가 base와 plus를 구분하지 않고 전체 값을 반환하므로
        // 전체 값을 base로 설정하고 plus는 undefined로 설정
        return { base: statValue, plus: undefined };
      };

      monsters.push({
        name: String(name).trim(),
        runeSet: String(runeSet).trim(),
        rune2: String(rune2).trim(),
        stats: {
          hp: getStat('hp'),
          atk: getStat('atk'),
          def: getStat('def'),
          spd: getStat('spd'),
          cr: getStat('cr'),
          cd: getStat('cd'),
          res: getStat('res'),
          acc: getStat('acc'),
        },
      });
    }

    return monsters;
  })();

  const hasValidData = monsterDetails.length > 0 || monsterImageUrls.some((url) => url !== null);

  const selectedMonster =
    monsterDetails.length > 0
      ? monsterDetails[Math.min(Math.max(selectedMonsterIndex, 0), monsterDetails.length - 1)]
      : null;

  // selectedItem이 변경될 때 lastSelectedItem 업데이트
  useEffect(() => {
    if (selectedItem) {
      setLastSelectedItem(selectedItem);
      setImageLoadErrors(new Set());
      setSelectedMonsterIndex(0);
    }
  }, [selectedItem]);

  // 에러 발생 시 토스트 표시
  useEffect(() => {
    if (error) {
      showToast.error(error);
    }
  }, [error]);

  const handleClose = () => {
    setLastSelectedItem(null);
    setImageLoadErrors(new Set());
    setSelectedMonsterIndex(0);
    setEditStats(createInitialDeckStats());
    onClose();
  };

  const handleEditStatChange = (monsterIndex: number, key: EditableStatKey, value: number) => {
    setEditStats((prev) =>
      prev.map((stats, index) =>
        index === monsterIndex
          ? {
              ...stats,
              [key]: value,
            }
          : stats,
      ),
    );
  };

  const selectMonster = (index: number) => {
    if (index < 0 || index >= monsterImageUrls.length) return;
    setSelectedMonsterIndex(index);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches && e.touches.length > 0) {
      touchStartXRef.current = e.touches[0].clientX;
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const endX = e.changedTouches?.[0]?.clientX;
    if (endX === undefined) {
      touchStartXRef.current = null;
      return;
    }

    const diffX = endX - touchStartXRef.current;
    const threshold = 30;

    if (Math.abs(diffX) > threshold) {
      if (diffX < 0) {
        selectMonster(Math.min(selectedMonsterIndex + 1, monsterImageUrls.length - 1));
      } else {
        selectMonster(Math.max(selectedMonsterIndex - 1, 0));
      }
    }

    touchStartXRef.current = null;
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

  const onEditSave = () => {
    const target = lastSelectedItem || detailDataRecord;
    if (!target) {
      showToast.error('수정할 공덱 정보가 없습니다.');
      return;
    }
    try {
      const { deck_id } = validateParams(target);
      updateDeckMutation.mutate({
        deck_id,
        monster_1_stats: editStats[0],
        monster_2_stats: editStats[1],
        monster_3_stats: editStats[2],
      });
    } catch (err) {
      console.error('공덱 스탯 수정 실패:', err);
      showToast.error('수정 중 오류가 발생했습니다.');
    }
  };

  // 상세 데이터 로드 시 기본 editStats 초기화 (편집 중이 아닐 때만)
  useEffect(() => {
    if (!detailDataRecord) return;
    if (isEditing) return;
    setEditStats([
      extractStatsFromDetail(detailDataRecord, 1),
      extractStatsFromDetail(detailDataRecord, 2),
      extractStatsFromDetail(detailDataRecord, 3),
    ]);
  }, [detailDataRecord, extractStatsFromDetail, isEditing]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      sx={{
        zIndex: (t) => t.zIndex.modal + 1,
      }}
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: theme.shadows[8],
          m: { xs: 2, sm: 3 },
          maxHeight: { xs: 'calc(100vh - 32px)', sm: 'calc(100vh - 64px)' },
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
        <Typography variant="subtitle1" component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
          공덱 상세
        </Typography>
        <IconButton
          onClick={handleClose}
          size="small"
          aria-label="닫기"
          sx={{
            color: 'text.secondary',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          p: { xs: 2, sm: 2.5 },
          bgcolor: 'grey.50',
          maxHeight: { xs: 'calc(100vh - 200px)', sm: 'calc(100vh - 240px)' },
          overflowY: 'auto',
          overflowX: 'hidden',
          '& > *:first-of-type': { mt: 0 },
        }}
      >
        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5 }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} variant="rounded" width={88} height={88} sx={{ borderRadius: 1.5 }} />
              ))}
            </Box>
            <Skeleton variant="rounded" height={180} sx={{ borderRadius: 1.5 }} />
          </Box>
        )}

        {error && !loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, textAlign: 'center', px: 2 }}>
            <WarningIcon sx={{ fontSize: 64, color: 'error.main', mb: 2, opacity: 0.8 }} />
            <Typography color="error" variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              오류 발생
            </Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
              {error}
            </Typography>
            <Button variant="contained" color="primary" onClick={() => refetch()} sx={{ borderRadius: 2 }}>
              다시 시도
            </Button>
          </Box>
        )}

        {!loading && !error && detailDataRecord && hasValidData && !isEditing && (
          <Box>
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: { xs: 1.25, sm: 1.75 },
                flexWrap: 'wrap',
              }}
            >
              {monsterImageUrls.map((imageUrl, index) => {
                const selected = index === selectedMonsterIndex;
                return (
                  <Box
                    key={index}
                    sx={{
                      position: 'relative',
                      cursor: 'pointer',
                      transition: theme.transitions.create(['transform', 'box-shadow'], {
                        duration: theme.transitions.duration.shorter,
                      }),
                      transform: selected ? 'scale(1.02)' : 'scale(1)',
                      '&:hover': { transform: selected ? 'scale(1.02)' : 'scale(1.01)' },
                    }}
                    onClick={() => selectMonster(index)}
                  >
                    {imageUrl && !imageLoadErrors.has(imageUrl) ? (
                      <Box
                        sx={{
                          position: 'relative',
                          width: { xs: 76, sm: 92 },
                          height: { xs: 76, sm: 92 },
                          bgcolor: 'grey.200',
                          borderRadius: 2,
                          border: '2px solid',
                          borderColor: selected ? 'primary.main' : 'grey.300',
                          boxShadow: selected ? 3 : 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        <Avatar
                          src={imageUrl}
                          alt={`몬스터 ${index + 1}`}
                          sx={{
                            width: '100%',
                            height: '100%',
                            borderRadius: 0,
                          }}
                          onError={() => handleImageError(imageUrl)}
                        />
                        {index === 0 && (
                          <Chip
                            label="L"
                            size="small"
                            color="primary"
                            sx={{
                              position: 'absolute',
                              top: 6,
                              left: 6,
                              height: 22,
                              minWidth: 22,
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              '& .MuiChip-label': { px: 0.75 },
                            }}
                          />
                        )}
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          width: { xs: 76, sm: 92 },
                          height: { xs: 76, sm: 92 },
                          bgcolor: 'grey.200',
                          borderRadius: 2,
                          border: '2px dashed',
                          borderColor: 'grey.400',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 0.5,
                        }}
                      >
                        <BrokenImageIcon sx={{ fontSize: 22, color: 'grey.500' }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          없음
                        </Typography>
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>

            {/* 선택된 몬스터 상세 정보 */}
            {selectedMonster ? (
              <Box
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                sx={{
                  touchAction: 'pan-y',
                  p: { xs: 1.5, sm: 2 },
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <MonsterDetailCard monster={selectedMonster} monsterIndex={selectedMonsterIndex + 1} />
              </Box>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                py: 8, 
                textAlign: 'center',
                px: 2,
              }}>
                <InfoOutlinedIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                <Typography color="text.secondary" variant="body1" sx={{ fontWeight: 500 }}>
                  몬스터 정보가 없습니다.
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {!loading && !error && detailDataRecord && hasValidData && isEditing && (
          <Box>
            {[1, 2, 3].map((idx) => {
              const index = idx - 1;
              const name = detailDataRecord[`m${idx}_kr_name`];
              const imageUrl = detailDataRecord[`image_url${idx}`];
              const leader = idx === 1;
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
                    mb: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                    '&:before': { display: 'none' },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Avatar
                        src={imageUrl ? getMonsterImageUrl(String(imageUrl)) : undefined}
                        sx={{ width: 48, height: 48 }}
                      />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }} noWrap>
                          {name ? String(name) : `몬스터 ${idx}`}
                          {leader && <Chip label="리더" size="small" color="warning" />}
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      {(
                        [
                          { key: 'hp', label: '체력 (HP)' },
                          { key: 'atk', label: '공격력 (ATK)' },
                          { key: 'def', label: '방어력 (DEF)' },
                          { key: 'spd', label: '공격속도 (SPD)' },
                          { key: 'critRate', label: '치명타 확률 (%)' },
                          { key: 'critDmg', label: '치명타 피해 (%)' },
                          { key: 'resistance', label: '효과 저항 (%)' },
                          { key: 'accuracy', label: '효과 적중 (%)' },
                        ] as const
                      ).map((f) => (
                        <Box key={f.key} sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }}>
                          <TextField
                            label={f.label}
                            type="number"
                            value={editStats[index][f.key] ?? 0}
                            onChange={(e) => {
                              handleEditStatChange(index, f.key, Number(e.target.value));
                            }}
                            fullWidth
                            size="small"
                          />
                        </Box>
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        )}

        {!loading && !error && (!detailDataRecord || !hasValidData) && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            py: 8, 
            textAlign: 'center',
            px: 2,
          }}>
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

