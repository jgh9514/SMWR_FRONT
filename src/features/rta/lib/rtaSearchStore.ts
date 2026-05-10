import {
  addRtaSessionRecent,
  filterSessionBookmarks,
  isRtaSessionFavorite,
  readRtaSessionFavorites,
  readRtaSessionRecent,
  removeRtaSessionRecent,
  setRtaSessionFavorite,
  toggleRtaSessionFavorite,
  type RtaSummonerSessionBookmark,
} from './rtaSummonerSessionSearchStorage';

type Listener = () => void;

let _recent: RtaSummonerSessionBookmark[] = [];
let _favorites: RtaSummonerSessionBookmark[] = [];
const _listeners = new Set<Listener>();

function notify() {
  _listeners.forEach((fn) => fn());
}

export function initStore() {
  if (typeof window === 'undefined') return;
  _recent = readRtaSessionRecent();
  _favorites = readRtaSessionFavorites();
}

export function subscribeStore(listener: Listener) {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

export function getRecent() { return _recent; }
export function getFavorites() { return _favorites; }

export function storeAddRecent(entry: Omit<RtaSummonerSessionBookmark, 'updatedAt'>) {
  addRtaSessionRecent(entry);
  _recent = readRtaSessionRecent();
  notify();
}

export function storeRemoveRecent(wizardId: string) {
  removeRtaSessionRecent(wizardId);
  _recent = readRtaSessionRecent();
  notify();
}

export function storeIsFavorite(wizardId: string) {
  return isRtaSessionFavorite(wizardId);
}

export function storeSetFavorite(entry: Omit<RtaSummonerSessionBookmark, 'updatedAt'>, favor: boolean) {
  setRtaSessionFavorite(entry, favor);
  _favorites = readRtaSessionFavorites();
  notify();
}

export function storeToggleFavorite(entry: Omit<RtaSummonerSessionBookmark, 'updatedAt'>): boolean {
  const next = toggleRtaSessionFavorite(entry);
  _favorites = readRtaSessionFavorites();
  notify();
  return next;
}

export { filterSessionBookmarks };
