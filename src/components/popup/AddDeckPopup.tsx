'use client';

import { useState, useEffect } from 'react';
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
import { showToast } from '@/shared/lib/notification';
import { getMonsterImageUrl } from '@/shared/utils/image';
import type { DeckMonsterStats } from '@/features/siege/types/siege';

interface AddDeckPopupProps {
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
  type?: 'bang' | 'empty';
  defenseMonster?: { dm1: string; dm2: string; dm3: string };
}

export default function AddDeckPopup({
  open,
  onClose,
  onSave,
  type: propType,
  defenseMonster: propDefenseMonster,
}: AddDeckPopupProps) {
  const [type, setType] = useState<0 | 1 | 2>(0);
  const [defenseMonster, setDefenseMonster] = useState<any>(null);
  const [selectedMonsterList, setSelectedMonsterList] = useState<MonsterOption[]>([]);
  const [selectedMonsterIds, setSelectedMonsterIds] = useState<string[]>([]);
  const [step, setStep] = useState(1);
  const [expandedPanel, setExpandedPanel] = useState<number[]>([0, 1, 2]);
  const [monsterStats, setMonsterStats] = useState<DeckMonsterStats[]>([
    { hp: 0, atk: 0, def: 0, spd: 0, critRate: 0, critDmg: 0, resistance: 0, accuracy: 0 },
    { hp: 0, atk: 0, def: 0, spd: 0, critRate: 0, critDmg: 0, resistance: 0, accuracy: 0 },
    { hp: 0, atk: 0, def: 0, spd: 0, critRate: 0, critDmg: 0, resistance: 0, accuracy: 0 },
  ]);

  // 몬스터 목록 조회 (React Query 사용)
  const { data: monsterList = [] } = useMonsterList();

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

  const handleOpen = (openType: 'bang' | 'empty', id?: any) => {
    if (openType === 'bang') {
      setType(1);
    } else if (openType === 'empty') {
      setType(2);
      setDefenseMonster(id);
    }
    setStep(1);
  };

  const handleMonsterChange = (monsterIds: string[]) => {
    if (monsterIds.length > 3) {
      showToast.error('최대 3개까지 선택할 수 있습니다.');
      return;
    }
    setSelectedMonsterIds(monsterIds);
    setSelectedMonsterList(
      monsterIds.map((id) => monsterList.find((m) => m.monster_id === id)).filter(Boolean) as MonsterOption[],
    );
  };

  const removeMonster = (monsterIdOrIndex: string | number) => {
    if (typeof monsterIdOrIndex === 'string') {
      setSelectedMonsterIds((prev) => prev.filter((id) => id !== monsterIdOrIndex));
    } else {
      const index = monsterIdOrIndex;
      const monsterToRemove = selectedMonsterList[index];
      if (monsterToRemove) {
        setSelectedMonsterIds((prev) => prev.filter((id) => id !== monsterToRemove.monster_id));
      }
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

  const save = () => {
    if (selectedMonsterList.length !== 3) {
      showToast.error('몬스터를 선택해주세요.');
      return;
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
    };

    saveDeckMutation.mutate(saveData);
  };

  const handleClose = () => {
    setSelectedMonsterList([]);
    setSelectedMonsterIds([]);
    setStep(1);
    setMonsterStats([
      { hp: 0, atk: 0, def: 0, spd: 0, critRate: 0, critDmg: 0, resistance: 0, accuracy: 0 },
      { hp: 0, atk: 0, def: 0, spd: 0, critRate: 0, critDmg: 0, resistance: 0, accuracy: 0 },
      { hp: 0, atk: 0, def: 0, spd: 0, critRate: 0, critDmg: 0, resistance: 0, accuracy: 0 },
    ]);
    onClose();
  };

  const handleImageError = (event: React.SyntheticEvent<HTMLElement, Event>, imageUrl: string) => {
    // Avatar의 경우 img 태그를 찾아서 대체
    const img = (event.currentTarget as HTMLElement).querySelector('img');
    if (img) {
      img.src = getMonsterImageUrl('/images/default-monster.png');
    }
  };

  useEffect(() => {
    if (open) {
      if (propType === 'bang') {
        setType(1);
      } else if (propType === 'empty' && propDefenseMonster) {
        setType(2);
        setDefenseMonster(propDefenseMonster);
      }
      setStep(1);
    }
  }, [open, propType, propDefenseMonster]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen>
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
                ListboxProps={{
                  style: { maxHeight: 400, overflow: 'auto' },
                }}
                value={selectedMonsterList}
                onChange={(_, newValue) => {
                  handleMonsterChange(newValue.map((m) => m.monster_id));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="몬스터 검색 및 선택"
                    variant="outlined"
                    aria-label="몬스터 검색 입력"
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
                        onError={(e) => handleImageError(e, option.image_url)}
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
                          onError={(e) => handleImageError(e, option.image_url)}
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
                      <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }}>
                        <TextField
                          label="체력 (HP)"
                          type="number"
                          value={monsterStats[index].hp}
                          onChange={(e) => {
                            const newStats = [...monsterStats];
                            newStats[index].hp = Number(e.target.value);
                            setMonsterStats(newStats);
                          }}
                          fullWidth
                          size="small"
                        />
                      </Box>
                      <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }}>
                        <TextField
                          label="공격력 (ATK)"
                          type="number"
                          value={monsterStats[index].atk}
                          onChange={(e) => {
                            const newStats = [...monsterStats];
                            newStats[index].atk = Number(e.target.value);
                            setMonsterStats(newStats);
                          }}
                          fullWidth
                          size="small"
                        />
                      </Box>
                      <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }}>
                        <TextField
                          label="방어력 (DEF)"
                          type="number"
                          value={monsterStats[index].def}
                          onChange={(e) => {
                            const newStats = [...monsterStats];
                            newStats[index].def = Number(e.target.value);
                            setMonsterStats(newStats);
                          }}
                          fullWidth
                          size="small"
                        />
                      </Box>
                      <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }}>
                        <TextField
                          label="공격속도 (SPD)"
                          type="number"
                          value={monsterStats[index].spd}
                          onChange={(e) => {
                            const newStats = [...monsterStats];
                            newStats[index].spd = Number(e.target.value);
                            setMonsterStats(newStats);
                          }}
                          fullWidth
                          size="small"
                        />
                      </Box>
                      <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }}>
                        <TextField
                          label="치명타 확률 (%)"
                          type="number"
                          value={monsterStats[index].critRate}
                          onChange={(e) => {
                            const newStats = [...monsterStats];
                            newStats[index].critRate = Number(e.target.value);
                            setMonsterStats(newStats);
                          }}
                          fullWidth
                          size="small"
                        />
                      </Box>
                      <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }}>
                        <TextField
                          label="치명타 피해 (%)"
                          type="number"
                          value={monsterStats[index].critDmg}
                          onChange={(e) => {
                            const newStats = [...monsterStats];
                            newStats[index].critDmg = Number(e.target.value);
                            setMonsterStats(newStats);
                          }}
                          fullWidth
                          size="small"
                        />
                      </Box>
                      <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }}>
                        <TextField
                          label="효과 저항 (%)"
                          type="number"
                          value={monsterStats[index].resistance}
                          onChange={(e) => {
                            const newStats = [...monsterStats];
                            newStats[index].resistance = Number(e.target.value);
                            setMonsterStats(newStats);
                          }}
                          fullWidth
                          size="small"
                        />
                      </Box>
                      <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' } }}>
                        <TextField
                          label="효과 적중 (%)"
                          type="number"
                          value={monsterStats[index].accuracy}
                          onChange={(e) => {
                            const newStats = [...monsterStats];
                            newStats[index].accuracy = Number(e.target.value);
                            setMonsterStats(newStats);
                          }}
                          fullWidth
                          size="small"
                        />
                      </Box>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
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

