'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  TextField,
  Box,
  Avatar,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Autocomplete,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useMonsterList, type MonsterOption, useApiPostMutation } from '@/hooks/api';
import { useResponsive } from '@/shared/hooks';
import { showToast } from '@/shared/lib/notification';
import { getMonsterImageUrl } from '@/shared/utils/image';
import RuneSetPicker from '@/features/siege/components/RuneSetPicker';
import { useRuneMasterList } from '@/features/siege/hooks/useRuneMaster';
import { runeSelectionErrorMessage, selectionFromDeckMonsterStats } from '@/features/siege/utils/runeValidation';
import { createEmptyDeckMonsterStats, type DeckMonsterStats } from '@/features/siege/types/siege';
import type { DeckMonsterRuneSelection } from '@/features/siege/types/rune';

interface AddDeckPopupProps {
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
  type?: 'bang' | 'empty';
  defenseMonster?: { dm1: string; dm2: string; dm3: string };
}

const STAT_INPUT_FIELDS: Array<{ key: keyof DeckMonsterStats; label: string }> = [
  { key: 'hp', label: '체력 (HP)' },
  { key: 'atk', label: '공격력 (ATK)' },
  { key: 'def', label: '방어력 (DEF)' },
  { key: 'spd', label: '공격속도 (SPD)' },
  { key: 'critRate', label: '치명타 확률 (%)' },
  { key: 'critDmg', label: '치명타 피해 (%)' },
  { key: 'resistance', label: '효과 저항 (%)' },
  { key: 'accuracy', label: '효과 적중 (%)' },
];

export default function AddDeckPopup({
  open,
  onClose,
  onSave,
  type: propType,
  defenseMonster: propDefenseMonster,
}: AddDeckPopupProps) {
  const { isMobile } = useResponsive();
  const [selectedMonsterList, setSelectedMonsterList] = useState<MonsterOption[]>([]);
  const [step, setStep] = useState(1);
  const [expandedPanel, setExpandedPanel] = useState<number[]>([0, 1, 2]);
  const [targetingOrder, setTargetingOrder] = useState('');
  const [deckComment, setDeckComment] = useState('');
  const [monsterStats, setMonsterStats] = useState<DeckMonsterStats[]>([
    createEmptyDeckMonsterStats(),
    createEmptyDeckMonsterStats(),
    createEmptyDeckMonsterStats(),
  ]);
  const [monsterStatsOrList, setMonsterStatsOrList] = useState<DeckMonsterStats[][]>([[], [], []]);
  const type = propType === 'bang' ? 1 : propType === 'empty' ? 2 : 0;
  const defenseMonster = propDefenseMonster ?? null;
  const [targetingOrderIds, setTargetingOrderIds] = useState<string[]>([]);

  // 몬스터 목록 조회 (React Query 사용)
  const { data: monsterList = [] } = useMonsterList();
  const { runeById } = useRuneMasterList();
  const monsterById = useMemo(() => {
    const map = new Map<string, MonsterOption>();
    for (const m of monsterList) {
      map.set(String(m.monster_id), m);
    }
    return map;
  }, [monsterList]);
  const defenseTargetCandidates = useMemo(
    () => [defenseMonster?.dm1, defenseMonster?.dm2, defenseMonster?.dm3].filter((v): v is string => !!v && v.trim() !== ''),
    [defenseMonster?.dm1, defenseMonster?.dm2, defenseMonster?.dm3],
  );

  useEffect(() => {
    if (defenseTargetCandidates.length !== 3) return;
    setTargetingOrderIds(defenseTargetCandidates);
    setTargetingOrder(defenseTargetCandidates.join(' > '));
  }, [defenseTargetCandidates]);

  // 덱 저장 Mutation
  const saveDeckMutation = useApiPostMutation<string, {
    type: number;
    def_monster_1?: string;
    def_monster_2?: string;
    def_monster_3?: string;
    atk_monster_1: string;
    atk_monster_2: string;
    atk_monster_3: string;
    monster_1_stats: DeckMonsterStats;
    monster_2_stats: DeckMonsterStats;
    monster_3_stats: DeckMonsterStats;
    monster_1_stats_or_list?: DeckMonsterStats[];
    monster_2_stats_or_list?: DeckMonsterStats[];
    monster_3_stats_or_list?: DeckMonsterStats[];
    targeting_order?: string;
    deck_comment?: string;
  }>('/summonerswar/enemyTeam-save', {
    onSuccess: (res) => {
      if (res === 'SUCCESS') {
        showToast.success('저장되었습니다.');
        handleClose();
        onSave?.();
      } else {
        showToast.error('저장에 실패했습니다.');
      }
    },
    onError: (error) => {
      console.error('공덱 저장 실패:', error);
      showToast.error('저장 중 오류가 발생했습니다.');
    },
  });

  const handleMonsterChange = (monsters: MonsterOption[]) => {
    if (monsters.length > 3) {
      showToast.error('최대 3개까지 선택할 수 있습니다.');
      return;
    }
    setSelectedMonsterList(monsters);
  };

  const removeMonster = (monsterIdOrIndex: string | number) => {
    if (typeof monsterIdOrIndex === 'string') {
      setSelectedMonsterList((prev) =>
        prev.filter((monster) => monster.monster_id !== monsterIdOrIndex),
      );
    } else {
      const index = monsterIdOrIndex;
      setSelectedMonsterList((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
    }
  };

  const goToStep2 = () => {
    if (selectedMonsterList.length !== 3) {
      showToast.error('3개의 몬스터를 선택해주세요.');
      return;
    }
    setStep(2);
  };

  const goToStep1 = () => {
    setStep(1);
  };

  const handleRuneChange = (index: number, selection: DeckMonsterRuneSelection) => {
    setMonsterStats((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        runeId1: selection.runeId1,
        runeId2: selection.runeId2,
        runeId3: selection.runeId3,
      };
      return next;
    });
  };

  const handleRuneOrChange = (index: number, orIndex: number, selection: DeckMonsterRuneSelection) => {
    setMonsterStatsOrList((prev) => {
      const next = prev.map((list) => [...list]);
      const target = next[index]?.[orIndex];
      if (!target) return prev;
      next[index][orIndex] = {
        ...target,
        runeId1: selection.runeId1,
        runeId2: selection.runeId2,
        runeId3: selection.runeId3,
      };
      return next;
    });
  };

  const updateMonsterStat = (
    target: 'primary' | 'or',
    index: number,
    key: keyof DeckMonsterStats,
    value: number,
    orIndex?: number,
  ) => {
    if (target === 'primary') {
      setMonsterStats((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [key]: value };
        return next;
      });
      return;
    }
    if (orIndex == null) return;
    setMonsterStatsOrList((prev) => {
      const next = prev.map((list) => [...list]);
      const targetStats = next[index]?.[orIndex];
      if (!targetStats) return prev;
      next[index][orIndex] = { ...targetStats, [key]: value };
      return next;
    });
  };

  const save = () => {
    if (selectedMonsterList.length !== 3) {
      showToast.error('몬스터를 선택해주세요.');
      return;
    }

    for (let i = 0; i < monsterStats.length; i += 1) {
      const err = runeSelectionErrorMessage(selectionFromDeckMonsterStats(monsterStats[i]), runeById);
      if (err) {
        showToast.error(`${selectedMonsterList[i]?.kr_name ?? `몬스터 ${i + 1}`}: ${err}`);
        return;
      }
      for (let j = 0; j < (monsterStatsOrList[i]?.length ?? 0); j += 1) {
        const errOr = runeSelectionErrorMessage(selectionFromDeckMonsterStats(monsterStatsOrList[i][j]), runeById);
        if (errOr) {
          showToast.error(`${selectedMonsterList[i]?.kr_name ?? `몬스터 ${i + 1}`} OR${j + 1}: ${errOr}`);
          return;
        }
      }
    }

    const saveData = {
      type: type,
      def_monster_1: defenseMonster?.dm1,
      def_monster_2: defenseMonster?.dm2,
      def_monster_3: defenseMonster?.dm3,
      atk_monster_1: selectedMonsterList[0].monster_id,
      atk_monster_2: selectedMonsterList[1].monster_id,
      atk_monster_3: selectedMonsterList[2].monster_id,
      monster_1_stats: monsterStats[0],
      monster_2_stats: monsterStats[1],
      monster_3_stats: monsterStats[2],
      ...(monsterStatsOrList[0]?.length ? { monster_1_stats_or_list: monsterStatsOrList[0] } : {}),
      ...(monsterStatsOrList[1]?.length ? { monster_2_stats_or_list: monsterStatsOrList[1] } : {}),
      ...(monsterStatsOrList[2]?.length ? { monster_3_stats_or_list: monsterStatsOrList[2] } : {}),
      ...(targetingOrder.trim() ? { targeting_order: targetingOrder.trim() } : {}),
      ...(deckComment.trim() ? { deck_comment: deckComment.trim() } : {}),
    };

    saveDeckMutation.mutate(saveData);
  };

  const moveTargetingOrder = (index: number, direction: -1 | 1) => {
    setTargetingOrderIds((prev) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      setTargetingOrder(next.join(' > '));
      return next;
    });
  };

  const handleClose = () => {
    setSelectedMonsterList([]);
    setStep(1);
    setMonsterStats([
      createEmptyDeckMonsterStats(),
      createEmptyDeckMonsterStats(),
      createEmptyDeckMonsterStats(),
    ]);
    setMonsterStatsOrList([[], [], []]);
    setTargetingOrder('');
    setDeckComment('');
    onClose();
  };

  const handleImageError = (event: React.SyntheticEvent<HTMLElement, Event>) => {
    // Avatar의 경우 img 태그를 찾아서 대체
    const img = (event.currentTarget as HTMLElement).querySelector('img');
    if (img) {
      img.src = getMonsterImageUrl('/images/default-monster.png');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen
      sx={{ zIndex: (t) => t.zIndex.modal + 20 }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6" component="span">
          점령전 {type === 1 ? '방덱' : '공덱'} 추가 - {step === 1 ? '몬스터 선택' : '스펙 입력'}
        </Typography>
        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {step === 1 && (
          <Box>
            {/* 선택된 몬스터 표시 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                선택된 몬스터 ({selectedMonsterList.length}/3)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
                {[0, 1, 2].map((index) => (
                  <Box
                    key={index}
                    sx={{
                      position: 'relative',
                      width: 80,
                      height: 80,
                      background: '#574424',
                      border: index === 0 ? '4px solid #d79f34' : '4px solid #6d5424',
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    onClick={() => removeMonster(index)}
                  >
                    {selectedMonsterList[index] ? (
                      <Avatar
                        src={getMonsterImageUrl(selectedMonsterList[index].image_url)}
                        sx={{ width: 60, height: 60 }}
                      />
                    ) : (
                      <Avatar src={getMonsterImageUrl('/images/unit_select_icon.png')} sx={{ width: 60, height: 60 }} />
                    )}
                    {index === 0 && !selectedMonsterList[0] && (
                      <Typography
                        sx={{
                          position: 'absolute',
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'white',
                          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                        }}
                      >
                        Leader
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>

            {/* 몬스터 검색 */}
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                몬스터 검색
              </Typography>
              <Autocomplete
                multiple
                options={monsterList}
                getOptionLabel={(option) =>
                  `${option.monster_id}|${option.kr_name} ${option.un_name} ${option.modified_kr_name || ''}`.trim()
                }
                isOptionEqualToValue={(option, value) => option.monster_id === value.monster_id}
                filterOptions={(options, { inputValue }) => {
                  if (!inputValue) return options.slice(0, 100);
                  const searchTerm = inputValue.toLowerCase();
                  return options.filter((option) => {
                    const krName = option.kr_name?.toLowerCase() || '';
                    const unName = option.un_name?.toLowerCase() || '';
                    const modifiedName = option.modified_kr_name?.toLowerCase() || '';
                    return krName.includes(searchTerm) || unName.includes(searchTerm) || modifiedName.includes(searchTerm);
                  }).slice(0, 200);
                }}
                slotProps={{
                  popper: {
                    placement: isMobile ? 'top-start' : 'bottom-start',
                    modifiers: isMobile
                      ? [{ name: 'flip', enabled: false }, { name: 'preventOverflow', enabled: true }]
                      : undefined,
                  },
                }}
                ListboxProps={{
                  style: { maxHeight: isMobile ? 300 : 400, overflow: 'auto' },
                }}
                value={selectedMonsterList}
                onChange={(_, newValue) => {
                  handleMonsterChange(newValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="몬스터 검색 및 선택"
                    variant="outlined"
                    aria-label="몬스터 검색 입력"
                    inputProps={{
                      ...params.inputProps,
                      onFocus: (e) => {
                        params.inputProps?.onFocus?.(e as React.FocusEvent<HTMLInputElement>);
                        if (isMobile && e.target instanceof HTMLInputElement) {
                          e.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                        }
                      },
                    }}
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <Box
                      component="li"
                      key={key}
                      {...otherProps}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        py: 1,
                      }}
                    >
                      <Avatar
                        src={getMonsterImageUrl(option.image_url)}
                        alt={option.kr_name}
                        sx={{ width: 40, height: 40, flexShrink: 0 }}
                        onError={handleImageError}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
                          {option.kr_name} {option.un_name}
                        </Typography>
                        {option.modified_kr_name && (
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {option.modified_kr_name}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option.monster_id}
                      label={option.kr_name}
                      avatar={
                        <Avatar
                          src={getMonsterImageUrl(option.image_url)}
                          alt={option.kr_name}
                          sx={{ borderRadius: 0 }}
                          onError={handleImageError}
                        />
                      }
                      onDelete={() => removeMonster(option.monster_id)}
                      color={index === 0 ? 'primary' : 'default'}
                    />
                  ))
                }
              />
            </Box>
          </Box>
        )}

        {step === 2 && (
          <Box>
            {selectedMonsterList.map((monster, index) => (
              <Accordion
                key={monster.monster_id}
                expanded={expandedPanel.includes(index)}
                onChange={(_, isExpanded) => {
                  setExpandedPanel((prev) =>
                    isExpanded ? [...prev, index] : prev.filter((p) => p !== index),
                  );
                }}
                sx={{ mb: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Avatar src={getMonsterImageUrl(monster.image_url)} sx={{ width: 48, height: 48 }} />
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                        {monster.kr_name}
                        {index === 0 && (
                          <Chip label="리더" size="small" color="warning" sx={{ ml: 1 }} />
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {monster.un_name}
                      </Typography>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      {STAT_INPUT_FIELDS.map((field) => (
                        <Box key={field.key} sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }}>
                          <TextField
                            label={field.label}
                            type="number"
                            value={monsterStats[index][field.key] as number}
                            onChange={(e) => updateMonsterStat('primary', index, field.key, Number(e.target.value))}
                            fullWidth
                            size="small"
                          />
                        </Box>
                      ))}
                    </Box>
                    <RuneSetPicker
                      value={selectionFromDeckMonsterStats(monsterStats[index])}
                      onChange={(selection) => handleRuneChange(index, selection)}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setMonsterStatsOrList((prev) => {
                            const next = [...prev];
                            next[index] = [...next[index], { ...monsterStats[index] }];
                            return next;
                          });
                        }}
                      >
                        OR 조건 추가
                      </Button>
                    </Box>
                    {(monsterStatsOrList[index] ?? []).map((orStats, orIdx) => (
                      <Box key={`or-${index}-${orIdx}`} sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1.5, p: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                            OR{orIdx + 1} 대안 스탯 / 룬 세트
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.75 }}>
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => {
                                setMonsterStatsOrList((prev) => {
                                  const next = prev.map((list) => [...list]);
                                  next[index][orIdx] = { ...monsterStats[index] };
                                  return next;
                                });
                              }}
                            >
                              스탯 동일하게
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              variant="text"
                              onClick={() => {
                                setMonsterStatsOrList((prev) => {
                                  const next = prev.map((list) => [...list]);
                                  next[index] = next[index].filter((_, idx2) => idx2 !== orIdx);
                                  return next;
                                });
                              }}
                            >
                              삭제
                            </Button>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                          {STAT_INPUT_FIELDS.map((field) => (
                            <Box key={`or-${orIdx}-${field.key}`} sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }}>
                              <TextField
                                label={field.label}
                                type="number"
                                value={orStats[field.key] as number}
                                onChange={(e) => updateMonsterStat('or', index, field.key, Number(e.target.value), orIdx)}
                                fullWidth
                                size="small"
                              />
                            </Box>
                          ))}
                        </Box>
                        <RuneSetPicker
                          value={selectionFromDeckMonsterStats(orStats)}
                          onChange={(selection) => handleRuneOrChange(index, orIdx, selection)}
                        />
                      </Box>
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
            <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {targetingOrderIds.length === 3 ? (
                <Box
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    p: 1.25,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    타겟팅 순서 (방덱 몬스터 기준)
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {targetingOrderIds.map((monsterId, idx) => {
                      const m = monsterById.get(monsterId);
                      return (
                        <Box
                          key={`targeting-${monsterId}-${idx}`}
                          sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            px: 1,
                            py: 0.75,
                            minWidth: 160,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.75,
                          }}
                        >
                          <Chip size="small" color="primary" label={idx + 1} sx={{ height: 20 }} />
                          <Avatar
                            src={m?.image_url ? getMonsterImageUrl(m.image_url) : undefined}
                            sx={{ width: 26, height: 26, '& img': { objectFit: 'contain' } }}
                          />
                          <Typography variant="caption" sx={{ flex: 1 }} noWrap>
                            {m?.kr_name || monsterId}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.25 }}>
                            <IconButton size="small" onClick={() => moveTargetingOrder(idx, -1)} disabled={idx === 0}>
                              <ChevronLeftIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => moveTargetingOrder(idx, 1)} disabled={idx === targetingOrderIds.length - 1}>
                              <ChevronRightIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              ) : (
                <TextField
                  label="타겟팅 순서"
                  placeholder="예: 2번 > 1번 > 3번"
                  value={targetingOrder}
                  onChange={(e) => setTargetingOrder(e.target.value)}
                  fullWidth
                  size="small"
                />
              )}
              <TextField
                label="코멘트"
                placeholder="운용 팁/주의사항"
                value={deckComment}
                onChange={(e) => setDeckComment(e.target.value)}
                fullWidth
                size="small"
                multiline
                minRows={2}
              />
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        {step === 2 && (
          <Button variant="outlined" onClick={goToStep1} startIcon={<ChevronLeftIcon />}>
            이전
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        {step === 1 && (
          <Button
            variant="contained"
            onClick={goToStep2}
            endIcon={<ChevronRightIcon />}
            disabled={selectedMonsterList.length !== 3}
          >
            다음
          </Button>
        )}
        {step === 2 && (
          <Button variant="contained" onClick={save} disabled={saveDeckMutation.isPending}>
            {saveDeckMutation.isPending ? '저장 중...' : '저장'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

