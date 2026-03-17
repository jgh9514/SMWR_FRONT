import type { BattleGroup, BattleItem } from '@/features/battle-history/types/battle-history';
import { formatSiegeDateLabel } from '@/shared/utils/format';

export function groupBattlesBySiegeId(battles: BattleItem[]): BattleGroup[] {
  const grouped: Record<string, BattleGroup> = {};

  battles.forEach((battle) => {
    const siegeId = battle.match_id;
    const dateLabel = formatSiegeDateLabel(siegeId) || siegeId;

    if (!grouped[siegeId]) {
      grouped[siegeId] = {
        dateLabel,
        guildsLabel: '',
        battles: [],
        winCount: 0,
        loseCount: 0,
      };
    }

    grouped[siegeId].battles.push(battle);
    if (battle.win_lose === '1') {
      grouped[siegeId].winCount += 1;
    } else {
      grouped[siegeId].loseCount += 1;
    }
  });

  return Object.values(grouped).map((group) => {
    const uniqueGuilds = new Set<string>();

    group.battles.forEach((battle) => {
      if (battle.guild_name) uniqueGuilds.add(battle.guild_name);
      if (battle.opp_guild_name) uniqueGuilds.add(battle.opp_guild_name);
    });

    return {
      ...group,
      guildsLabel: Array.from(uniqueGuilds).join(' vs '),
    };
  });
}
