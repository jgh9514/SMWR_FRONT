'use client';

import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Avatar,
  Chip,
  Autocomplete,
  TextField,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  useMonsterList,
  useRegisterSiegeDefenseDeckManual,
  type MonsterOption,
} from '@/hooks/api';
import { useResponsive } from '@/shared/hooks';
import { showToast } from '@/shared/lib/notification';
import { getMonsterImageUrl } from '@/shared/utils/image';

const LEADER_INDEX = 0;
const MAX_MONSTERS = 3;

export interface SiegeManualDefenseDeckDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 전투 집계(siege_defense_deck_stats)에 없어도 방덱을 시즌에 등록해 목록에 노출합니다.
 */
export function SiegeManualDefenseDeckDialog({ open, onClose }: SiegeManualDefenseDeckDialogProps) {
  const { isMobile } = useResponsive();
  const queryClient = useQueryClient();
  const { data: monsterList = [] } = useMonsterList();
  const [selectedMonsterList, setSelectedMonsterList] = useState<MonsterOption[]>([]);

  const registerMutation = useRegisterSiegeDefenseDeckManual({
    onSuccess: (res) => {
      if (res === 'SUCCESS') {
        showToast.success('방덱이 등록되었습니다.');
        void queryClient.invalidateQueries({ queryKey: ['/summonerswar/enemyTeam-list'] });
        setSelectedMonsterList([]);
        onClose();
      } else {
        showToast.error('등록에 실패했습니다.');
      }
    },
    onError: () => {
      showToast.error('등록 중 오류가 발생했습니다.');
    },
  });

  useEffect(() => {
    if (!open) return;
    setSelectedMonsterList([]);
  }, [open]);

  const handleImageError = useCallback((event: SyntheticEvent<HTMLElement, Event>) => {
    const img = (event.currentTarget as HTMLElement).querySelector('img');
    if (img) {
      img.src = getMonsterImageUrl('/images/default-monster.png');
    }
  }, []);

  const handleMonsterChange = useCallback((newValue: MonsterOption[]) => {
    if (newValue.length > MAX_MONSTERS) {
      showToast.error(`최대 ${MAX_MONSTERS}마리까지 선택할 수 있습니다.`);
      return;
    }
    setSelectedMonsterList(newValue);
  }, []);

  const handleRemoveMonster = useCallback((monsterId: string) => {
    setSelectedMonsterList((prev) => prev.filter((m) => m.monster_id !== monsterId));
  }, []);

  const handleSubmit = useCallback(() => {
    if (selectedMonsterList.length !== MAX_MONSTERS) {
      showToast.error(`리더 1마리와 지원 2마리(총 ${MAX_MONSTERS}마리)를 선택해 주세요.`);
      return;
    }
    const leaderId = selectedMonsterList[0].monster_id;
    const [id2, id3] = selectedMonsterList.slice(1).map((m) => m.monster_id).sort();
    registerMutation.mutate({
      def_monster_1: leaderId,
      def_monster_2: id2,
      def_monster_3: id3,
    });
  }, [selectedMonsterList, registerMutation]);

  const handleClose = useCallback(() => {
    if (registerMutation.isPending) return;
    setSelectedMonsterList([]);
    onClose();
  }, [onClose, registerMutation.isPending]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      aria-labelledby="siege-manual-defense-deck-title"
    >
      <DialogTitle
        id="siege-manual-defense-deck-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          pr: 1,
          background: 'linear-gradient(135deg, rgb(25, 118, 210) 0%, rgba(25, 118, 210, 0.85) 100%)',
          color: 'white',
        }}
      >
        <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
          방덱 수동 등록
        </Typography>
        <IconButton onClick={handleClose} sx={{ color: 'white' }} aria-label="닫기">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          전투 로그에 없어도 길드 시즌에 방덱을 남기면 목록에 표시됩니다. 첫 번째 슬롯이 리더이며, 지원 2마리는 ID
          순으로 정렬되어 저장됩니다.
        </Typography>

        <Box
          sx={{
            display: 'flex',
            gap: { xs: 1.5, sm: 2 },
            mb: 3,
            justifyContent: 'center',
          }}
          role="list"
          aria-label="선택된 몬스터 슬롯"
        >
          {Array.from({ length: MAX_MONSTERS }).map((_, index) => (
            <Box
              key={index}
              sx={{
                width: { xs: 72, sm: 88 },
                height: { xs: 72, sm: 88 },
                border: '3px solid #6d5424',
                borderRadius: 1,
                backgroundColor: '#574424',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
              role="listitem"
            >
              {selectedMonsterList[index] ? (
                <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                  <Avatar
                    src={getMonsterImageUrl(selectedMonsterList[index].image_url)}
                    alt={selectedMonsterList[index].kr_name}
                    sx={{
                      width: '100%',
                      height: '100%',
                      cursor: 'pointer',
                      borderRadius: 0,
                    }}
                    onClick={() => handleRemoveMonster(selectedMonsterList[index].monster_id)}
                    onError={handleImageError}
                  />
                  {index === LEADER_INDEX && (
                    <Chip
                      label={isMobile ? 'L' : 'Leader'}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        fontSize: '9px',
                        height: 18,
                        bgcolor: 'primary.main',
                        color: 'white',
                      }}
                    />
                  )}
                </Box>
              ) : (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: index === LEADER_INDEX ? 700 : 400,
                  }}
                >
                  {index === LEADER_INDEX ? (isMobile ? 'L' : 'Leader') : index + 1}
                </Typography>
              )}
            </Box>
          ))}
        </Box>

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
            return options
              .filter((option) => {
                const krName = option.kr_name?.toLowerCase() || '';
                const unName = option.un_name?.toLowerCase() || '';
                const modifiedName = option.modified_kr_name?.toLowerCase() || '';
                return (
                  krName.includes(searchTerm) ||
                  unName.includes(searchTerm) ||
                  modifiedName.includes(searchTerm)
                );
              })
              .slice(0, 200);
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
            style: { maxHeight: isMobile ? 280 : 360, overflow: 'auto' },
          }}
          value={selectedMonsterList}
          onChange={(_, newValue) => handleMonsterChange(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="몬스터 검색"
              placeholder="이름으로 검색 후 선택"
              variant="outlined"
              size={isMobile ? 'small' : 'medium'}
            />
          )}
          renderOption={(props, option) => {
            const { key, ...otherProps } = props;
            return (
              <Box
                component="li"
                key={key}
                {...otherProps}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}
              >
                <Avatar
                  src={getMonsterImageUrl(option.image_url)}
                  alt={option.kr_name}
                  sx={{ width: 40, height: 40, flexShrink: 0 }}
                  onError={handleImageError}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
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
                onDelete={() => handleRemoveMonster(option.monster_id)}
                color={index === LEADER_INDEX ? 'primary' : 'default'}
                size={isMobile ? 'small' : 'medium'}
              />
            ))
          }
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 0, gap: 1 }}>
        <Button variant="outlined" onClick={handleClose} disabled={registerMutation.isPending}>
          취소
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={selectedMonsterList.length !== MAX_MONSTERS || registerMutation.isPending}
        >
          {registerMutation.isPending ? '등록 중…' : '등록'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
