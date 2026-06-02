'use client';

import { useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { DEFAULT_PAGE_SIZE } from '@/shared/constants';
import { useRecordList } from '@/features/battle-history/hooks/useRecordList';
import BattleHistoryListClient from '@/features/battle-history/components/BattleHistoryListClient';
import BattleHistorySeasonFilter from '@/features/battle-history/components/BattleHistorySeasonFilter';
import BattleHistoryPersonSearch from '@/features/battle-history/components/BattleHistoryPersonSearch';
import type { SeasonItem, UserItem } from '@/features/battle-history/types/battle-history';
import GuildRequiredGate from '@/features/guild/components/GuildRequiredGate';

type Props = { initialSeasonList?: SeasonItem[] };

function BattleHistoryInner({ initialSeasonList = [] }: Props) {
  const [seasonNo, setSeasonNo] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const params = {
    paging: DEFAULT_PAGE_SIZE,
    offset: 0,
    ...(seasonNo !== '' && { season_no: seasonNo }),
  };
  const { data: userList = [] } = useRecordList(params);

  const filteredUserList = useMemo(() => {
    const raw = Array.isArray(userList) ? userList : [];
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return raw;
    return raw.filter((item: UserItem) =>
      item.wizard_name?.toLowerCase().includes(keyword)
    );
  }, [userList, searchKeyword]);

  return (
    <BattleHistoryListClient
      userList={filteredUserList}
      seasonNo={seasonNo || undefined}
      emptyMessage={
        searchKeyword.trim() && filteredUserList.length === 0
          ? '검색 결과가 없습니다.'
          : undefined
      }
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          mb: 2,
          p: 2,
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <BattleHistorySeasonFilter
          initialSeasonList={initialSeasonList}
          value={seasonNo}
          onChange={setSeasonNo}
        />
        <BattleHistoryPersonSearch value={searchKeyword} onChange={setSearchKeyword} />
      </Box>
    </BattleHistoryListClient>
  );
}

export default function BattleHistoryPageClient(props: Props) {
  return (
    <GuildRequiredGate title="전적 조회는 길드 가입이 필요합니다">
      <BattleHistoryInner {...props} />
    </GuildRequiredGate>
  );
}
