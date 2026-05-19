export type SiegeBattleLogItem = {
  logId: string;
  logTimestamp: string;
  matchId: string;
  baseNumber?: number | null;
  guildId?: string | null;
  wizardId?: string | null;
  wizardName?: string | null;
  oppGuildId?: string | null;
  oppWizardId?: string | null;
  oppWizardName?: string | null;
  winLose?: string | null;
  replayRidRef?: number | null;
  battleDesc?: string | null;
  matchScoreVar?: number | null;
  wizardLevel?: number | null;
  oppWizardLevel?: number | null;
  logTypeApi?: number | null;
  guildName?: string | null;
  oppGuildName?: string | null;
  fromCollector: boolean;
};

export type SiegeBattleLogListResponse = {
  matchId: string;
  list: SiegeBattleLogItem[];
  totalCount: number;
  totalPage: number;
};

export type SiegeBattleReplayResponse = {
  rid: number;
  matchId?: string | null;
  battleDesc?: string | null;
  source?: string | null;
  payload?: Record<string, unknown>;
};
