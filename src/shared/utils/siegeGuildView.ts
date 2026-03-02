export type SiegeGuildViewMode = 'MY' | 'ALL' | 'GUILD';

export type SiegeGuildViewSetting = {
  v: 1;
  mode: SiegeGuildViewMode;
  guild_id?: string | null;
  guild_name?: string | null;
};

export const SIEGE_GUILD_VIEW_KEY = 'smwr:siege-guild-view:v1';

export function readSiegeGuildViewSetting(): SiegeGuildViewSetting {
  if (typeof window === 'undefined') return { v: 1, mode: 'MY', guild_id: null, guild_name: null };
  try {
    const raw = window.localStorage.getItem(SIEGE_GUILD_VIEW_KEY);
    if (!raw) return { v: 1, mode: 'MY', guild_id: null, guild_name: null };
    const parsed = JSON.parse(raw) as Partial<SiegeGuildViewSetting>;
    const mode = parsed.mode === 'ALL' || parsed.mode === 'GUILD' || parsed.mode === 'MY' ? parsed.mode : 'MY';
    const guild_id = typeof parsed.guild_id === 'string' ? parsed.guild_id : null;
    const guild_name = typeof parsed.guild_name === 'string' ? parsed.guild_name : null;
    return { v: 1, mode, guild_id, guild_name };
  } catch {
    return { v: 1, mode: 'MY', guild_id: null, guild_name: null };
  }
}

export function writeSiegeGuildViewSetting(setting: Omit<SiegeGuildViewSetting, 'v'>) {
  if (typeof window === 'undefined') return;
  const payload: SiegeGuildViewSetting = { v: 1, ...setting };
  window.localStorage.setItem(SIEGE_GUILD_VIEW_KEY, JSON.stringify(payload));
}

export function getSiegeGuildViewParamsForApi(): { view_all_guilds?: boolean; view_guild_id?: string } {
  const s = readSiegeGuildViewSetting();
  if (s.mode === 'ALL') return { view_all_guilds: true };
  if (s.mode === 'GUILD' && s.guild_id) return { view_guild_id: s.guild_id };
  return {};
}

