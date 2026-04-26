const STORAGE_VERSION = 1;
const MAX_RECENT = 12;
const MAX_FAVORITES = 50;

export const RTA_SESSION_SEARCH_STORAGE_EVENT = 'smw:rta-session-search-changed';

const PREFIX = 'smw:rta:home:sess:';

const RECENT_KEY = `${PREFIX}recent:v${STORAGE_VERSION}`;
const FAV_KEY = `${PREFIX}fav:v${STORAGE_VERSION}`;
/** `useSyncExternalStore` 스냅샷 — 모듈 인스턴스가 여러 개여도 sessionStorage 한 곳만 본다 */
const STORE_REV_KEY = `${PREFIX}storeRev:v${STORAGE_VERSION}`;

export type RtaSummonerSessionBookmark = {
  wizardId: string;
  wizardName: string;
  channelUid?: string;
  country?: string;
  updatedAt: number;
};

type StoredV1 = { v: number; list: RtaSummonerSessionBookmark[] };

function readStoreRevision(): number {
  const s = getStorage();
  if (!s) return 0;
  const raw = s.getItem(STORE_REV_KEY);
  const n = raw != null ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function bumpStoreRevision(): void {
  const s = getStorage();
  if (!s) return;
  const next = readStoreRevision() + 1;
  try {
    s.setItem(STORE_REV_KEY, String(next));
  } catch {
    // quota
  }
}

/** `useSyncExternalStore` getSnapshot — 번들 청크별 전역 변수 대신 sessionStorage 기준 */
export function getRtaSessionSearchStoreRevision(): number {
  return readStoreRevision();
}

function notifyRtaSessionSearchStorageChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(RTA_SESSION_SEARCH_STORAGE_EVENT));
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

function readList(key: string): RtaSummonerSessionBookmark[] {
  const s = getStorage();
  if (!s) return [];
  const raw = s.getItem(key);
  if (!raw) return [];
  try {
    const p = JSON.parse(raw) as StoredV1;
    if (!p || p.v !== 1 || !Array.isArray(p.list)) return [];
    return p.list
      .filter(
        (x) =>
          x &&
          typeof x.wizardId === 'string' &&
          x.wizardId.trim() !== '' &&
          typeof x.wizardName === 'string',
      )
      .map((x) => ({
        wizardId: x.wizardId.trim(),
        wizardName: (x.wizardName ?? '—').trim() || '—',
        channelUid: x.channelUid,
        country: x.country,
        updatedAt: typeof x.updatedAt === 'number' ? x.updatedAt : 0,
      }));
  } catch {
    return [];
  }
}

function writeList(key: string, list: RtaSummonerSessionBookmark[]) {
  const s = getStorage();
  if (!s) return;
  const body: StoredV1 = { v: 1, list };
  try {
    s.setItem(key, JSON.stringify(body));
    bumpStoreRevision();
    notifyRtaSessionSearchStorageChanged();
  } catch {
    // quota
  }
}

export function readRtaSessionRecent(): RtaSummonerSessionBookmark[] {
  return readList(RECENT_KEY).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function readRtaSessionFavorites(): RtaSummonerSessionBookmark[] {
  return readList(FAV_KEY).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function addRtaSessionRecent(entry: Omit<RtaSummonerSessionBookmark, 'updatedAt'>) {
  const now = Date.now();
  const next: RtaSummonerSessionBookmark = {
    ...entry,
    wizardId: entry.wizardId.trim(),
    wizardName: (entry.wizardName ?? '—').trim() || '—',
    channelUid: entry.channelUid,
    country: entry.country,
    updatedAt: now,
  };
  const cur = readRtaSessionRecent().filter((x) => x.wizardId !== next.wizardId);
  const merged = [next, ...cur].slice(0, MAX_RECENT);
  writeList(RECENT_KEY, merged);
}

export function removeRtaSessionRecent(wizardId: string) {
  const w = wizardId.trim();
  const cur = readRtaSessionRecent().filter((x) => x.wizardId !== w);
  writeList(RECENT_KEY, cur);
}

export function isRtaSessionFavorite(wizardId: string): boolean {
  const w = wizardId.trim();
  return readRtaSessionFavorites().some((x) => x.wizardId === w);
}

export function setRtaSessionFavorite(entry: Omit<RtaSummonerSessionBookmark, 'updatedAt'>, favor: boolean) {
  const now = Date.now();
  const wid = entry.wizardId.trim();
  if (!wid) return;
  let list = readRtaSessionFavorites();
  if (favor) {
    const base: RtaSummonerSessionBookmark = {
      ...entry,
      wizardId: wid,
      wizardName: (entry.wizardName ?? '—').trim() || '—',
      channelUid: entry.channelUid,
      country: entry.country,
      updatedAt: now,
    };
    const without = list.filter((x) => x.wizardId !== wid);
    list = [base, ...without].slice(0, MAX_FAVORITES);
  } else {
    list = list.filter((x) => x.wizardId !== wid);
  }
  writeList(FAV_KEY, list);
}

export function toggleRtaSessionFavorite(entry: Omit<RtaSummonerSessionBookmark, 'updatedAt'>): boolean {
  const next = !isRtaSessionFavorite(entry.wizardId);
  setRtaSessionFavorite(entry, next);
  return next;
}

export function filterSessionBookmarks(
  list: RtaSummonerSessionBookmark[],
  searchQuery: string,
): RtaSummonerSessionBookmark[] {
  const q = searchQuery.trim().toLowerCase();
  if (q === '') return list;
  return list.filter((b) => b.wizardName.toLowerCase().includes(q));
}

/**
 * 플레이어 요약 등 서버에서 받은 `channel_uid`·이름·국가로
 * 최근검색·즐겨찾기에 동일 `wizardId` 행을 보강한다(즐겨찾기 썸네일 누락 방지).
 */
export function mergeRtaSessionBookmarkFromServer(
  wizardId: string,
  opts: {
    channelUid?: string | number | null;
    wizardName?: string | null;
    country?: string | null;
  },
): void {
  const w = wizardId.trim();
  if (!w) return;

  const chRaw = opts.channelUid;
  const ch =
    chRaw != null && String(chRaw).trim() !== '' ? String(chRaw).trim() : undefined;
  const name = opts.wizardName?.trim();
  const co = opts.country?.trim();

  const patchList = (list: RtaSummonerSessionBookmark[]): RtaSummonerSessionBookmark[] | null => {
    let any = false;
    const next = list.map((x) => {
      if (x.wizardId !== w) return x;
      let changed = false;
      const nu = { ...x };
      if (ch && nu.channelUid !== ch) {
        nu.channelUid = ch;
        changed = true;
      }
      if (name && name !== '' && name !== '—' && nu.wizardName !== name) {
        nu.wizardName = name;
        changed = true;
      }
      if (co && co !== '' && co !== '—' && nu.country !== co) {
        nu.country = co;
        changed = true;
      }
      if (changed) {
        any = true;
        nu.updatedAt = Date.now();
      }
      return nu;
    });
    return any ? next : null;
  };

  const r = patchList(readRtaSessionRecent());
  if (r) writeList(RECENT_KEY, r);
  const f = patchList(readRtaSessionFavorites());
  if (f) writeList(FAV_KEY, f);
}

/** `useSyncExternalStore` subscribe — window 전용 */
export function subscribeRtaSessionSearchStore(onChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const handler = onChange;
  window.addEventListener(RTA_SESSION_SEARCH_STORAGE_EVENT, handler);
  return () => {
    window.removeEventListener(RTA_SESSION_SEARCH_STORAGE_EVENT, handler);
  };
}
