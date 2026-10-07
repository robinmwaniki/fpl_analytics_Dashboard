import type { ManagerPicks, ManagerPicksResult } from '../types/manager';

// Same-origin proxy: a Vercel Function in production (api/team-picks.ts)
// and a Vite dev-server proxy locally (vite.config.ts).
const PICKS_ENDPOINT = '/api/team-picks';
const STORAGE_KEY = 'fpl-manager-id';

function isManagerPicks(value: unknown): value is ManagerPicks {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ManagerPicks>;
  return (
    Array.isArray(v.picks) &&
    v.picks.length === 15 &&
    typeof v.entry_history === 'object' &&
    v.entry_history !== null
  );
}

/** Loads a manager's squad for a gameweek through the same-origin proxy. */
export async function fetchManagerPicks(managerId: number, gameweek: number): Promise<ManagerPicksResult> {
  try {
    const res = await fetch(`${PICKS_ENDPOINT}?id=${managerId}&gw=${gameweek}`);
    if (res.status === 404) return { status: 'not-found' };
    if (!res.ok) return { status: 'unavailable' };

    const json: unknown = await res.json();
    return isManagerPicks(json) ? { status: 'ok', data: json } : { status: 'unavailable' };
  } catch {
    return { status: 'unavailable' };
  }
}

/** The saved team ID lives only in this browser's localStorage. Storage can be blocked, so it is guarded. */
export function readStoredManagerId(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function storeManagerId(managerId: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(managerId));
  } catch {
    // Storage unavailable (private mode or blocked): the feature still works, it just won't be remembered.
  }
}