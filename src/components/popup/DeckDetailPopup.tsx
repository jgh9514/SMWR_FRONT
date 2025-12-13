'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Box,
  Avatar,
  Chip,
  CircularProgress,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningIcon from '@mui/icons-material/Warning';
import { useDeckDetail, useDeleteDeck } from '@/hooks/api';
import { showToast, confirm } from '@/shared/lib/notification';
import { getMonsterImageUrl } from '@/shared/utils/image';
import MonsterDetailCard from '@/features/siege/components/MonsterDetailCard';
import type { RecommendedItem } from '@/features/siege/types/siegeDetail';
import type { Monster } from '@/features/siege/types/siege';

interface DeckDetailPopupProps {
  open: boolean;
  onClose: () => void;
  onDeleted?: (deckId: string) => void;
  selectedItem?: RecommendedItem | null;
}

export default function DeckDetailPopup({ open, onClose, onDeleted, selectedItem }: DeckDetailPopupProps) {
  const [lastSelectedItem, setLastSelectedItem] = useState<RecommendedItem | null>(null);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
  const [selectedMonsterIndex, setSelectedMonsterIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);

  // 공덱 상세 조회 (React Query 사용)
  const deckParams = useMemo(() => {
    if (!lastSelectedItem || !lastSelectedItem.team_id) return null;
    return { deck_id: String(lastSelectedItem.team_id) };
  }, [lastSelectedItem]);

  const {
    data: detailData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useDeckDetail(deckParams);

  const error = queryError ? (queryError instanceof Error ? queryError.message : '데이터를 불러오는데 실패했습니다.') : null;

  // detailData를 Record 타입으로 타입 단언
  const detailDataRecord = detailData as Record<string, any> | null | undefined;

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

  const normalizeStatValue = (value: any, defaultValue = 0): number => {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    const numValue = Number(value);
    return isNaN(numValue) ? defaultValue : numValue;
  };

  const validateParams = (target: RecommendedItem | Record<string, any>): { deck_id: string } => {
    const item = target as RecommendedItem;
    if (!item.team_id) {
      throw new Error('team_id가 없습니다.');
    }
    return { deck_id: String(item.team_id) };
  };

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

      const runeSet = detailDataRecord[`m${i}_rune_set`] || detailDataRecord.rune_set || '정보 없음';
      const rune2 = detailDataRecord[`m${i}_rune_2`] || detailDataRecord.rune_2 || '정보 없음';

      const getStat = (statName: string) => {
        const base = normalizeStatValue(
          detailDataRecord[`m${i}_${statName}_base`] || detailDataRecord[`${statName}_base`],
        );
        const plus = normalizeStatValue(
          detailDataRecord[`m${i}_${statName}_plus`] || detailDataRecord[`${statName}_plus`],
          null as any,
        );
        return { base, plus: plus !== null ? plus : undefined };
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
    onClose();
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

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: 24,
        },
      }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          px: 3,
          py: 2,
        }}
      >
        <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
          공덱 상세정보
        </Typography>
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'white',
            '&:hover': { 
              bgcolor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 3 }, pt: { xs: 3, sm: 4 }, maxHeight: '75vh', overflowY: 'auto' }}>
        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
            <CircularProgress size={64} thickness={4} />
            <Typography sx={{ mt: 3, color: 'text.secondary', fontWeight: 500 }}>
              데이터를 불러오는 중...
            </Typography>
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

        {!loading && !error && detailDataRecord && hasValidData && (
          <Box>
            {/* 공덱 구성 이미지 */}
            <Box 
              sx={{ 
                mb: 4, 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                gap: { xs: 1.5, sm: 2 },
                flexWrap: 'wrap',
              }}
            >
              {monsterImageUrls.map((imageUrl, index) => (
                <Box
                  key={index}
                  sx={{
                    position: 'relative',
                    transform: index === selectedMonsterIndex ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: index === selectedMonsterIndex ? 'scale(1.05)' : 'scale(1.02)',
                    },
                  }}
                  onClick={() => selectMonster(index)}
                >
                  {imageUrl && !imageLoadErrors.has(imageUrl) ? (
                    <Box
                      sx={{
                        position: 'relative',
                        width: { xs: 80, sm: 100 },
                        height: { xs: 80, sm: 100 },
                        backgroundColor: '#574424',
                        border: index === 0 
                          ? { xs: '3px solid #d79f34', sm: '4px solid #d79f34' }
                          : { xs: '3px solid #6d5424', sm: '4px solid #6d5424' },
                        borderRadius: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        boxShadow: index === selectedMonsterIndex
                          ? '0 4px 12px rgba(102, 126, 234, 0.3)'
                          : '0 2px 4px rgba(0, 0, 0, 0.1)',
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
                          label="Leader"
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: { xs: -6, sm: -8 },
                            right: { xs: -6, sm: -8 },
                            fontSize: { xs: '9px', sm: '10px' },
                            height: { xs: 18, sm: 20 },
                            minWidth: { xs: 18, sm: 'auto' },
                            bgcolor: 'primary.main',
                            color: 'white',
                            fontWeight: 600,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          }}
                        />
                      )}
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        width: { xs: 80, sm: 100 },
                        height: { xs: 80, sm: 100 },
                        backgroundColor: '#574424',
                        border: { xs: '3px solid #6d5424', sm: '4px solid #6d5424' },
                        borderRadius: 1.5,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.5,
                      }}
                    >
                      <BrokenImageIcon sx={{ fontSize: { xs: 20, sm: 24 }, color: 'rgba(255,255,255,0.5)' }} />
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>
                        없음
                      </Typography>
                    </Box>
                  )}
                  {index === selectedMonsterIndex && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: { xs: -28, sm: -32 },
                        left: '50%',
                        transform: 'translateX(-50%)',
                        bgcolor: 'primary.main',
                        color: 'white',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: { xs: '0.7rem', sm: '0.75rem' },
                        fontWeight: 600,
                        boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      선택됨
                    </Box>
                  )}
                </Box>
              ))}
            </Box>

            {/* 선택된 몬스터 상세 정보 */}
            {selectedMonster ? (
              <Box
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                sx={{ 
                  touchAction: 'pan-y',
                  mt: { xs: 4, sm: 5 },
                  animation: 'fadeIn 0.3s ease-in',
                  '@keyframes fadeIn': {
                    from: { opacity: 0, transform: 'translateY(10px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                  },
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

      <DialogActions sx={{ 
        p: { xs: 2, sm: 3 }, 
        pt: 2.5,
        borderTop: '1px solid', 
        borderColor: 'divider',
        gap: 1,
      }}>
        <Button 
          color="error" 
          variant="outlined" 
          onClick={onDeleteClick}
          disabled={deleteDeckMutation.isPending}
          sx={{ 
            borderRadius: 2,
            px: 3,
            fontWeight: 600,
            '&:hover': {
              bgcolor: 'error.main',
              color: 'white',
            },
          }}
        >
          {deleteDeckMutation.isPending ? '삭제 중...' : '삭제'}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button 
          color="primary" 
          variant="contained" 
          onClick={handleClose}
          sx={{ 
            borderRadius: 2,
            px: 3,
            fontWeight: 600,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)',
            },
          }}
        >
          닫기
        </Button>
      </DialogActions>
    </Dialog>
  );
}

