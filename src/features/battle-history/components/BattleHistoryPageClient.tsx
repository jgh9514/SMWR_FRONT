'use client';

import { useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { DEFAULT_PAGE_SIZE } from '@/shared/constants';
import { useRecordList } from '@/features/battle-history/hooks/useRecordList';
import BattleHistoryListClient from '@/features/battle-history/components/BattleHistoryListClient';
import BattleHistorySeasonFilter from '@/features/battle-history/components/BattleHistorySeasonFilter';
import BattleHistoryPersonSearch from '@/features/battle-history/components/BattleHistoryPersonSearch';
import type { SeasonItem, UserItem } from '@/features/battle-history/types/battle-history';

type Props = { initialSeasonList?: SeasonItem[] };

export default function BattleHistoryPageClient({ initialSeasonList = [] }: Props) {
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
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}>
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
