import type { PlayerGameweekHistory, PlayerHistoryResult } from '../types/playerHistory';

const PLAYER_HISTORY_ENDPOINT = '/api/player-history';
const REQUEST_TIMEOUT_MS = 10_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Validate only the stable fields rendered by the history panel. */
function isHistoryEntry(value: unknown): value is PlayerGameweekHistory {
  return (
    isRecord(value) &&
    isFiniteNumber(value.element) &&
    isFiniteNumber(value.fixture) &&
    isFiniteNumber(value.opponent_team) &&
    isFiniteNumber(value.total_points) &&
    typeof value.was_home === 'boolean' &&
    (value.kickoff_time === null || typeof value.kickoff_time === 'string') &&
    isFiniteNumber(value.round) &&
    isFiniteNumber(value.minutes) &&
    isFiniteNumber(value.goals_scored) &&
    isFiniteNumber(value.assists) &&
    isFiniteNumber(value.clean_sheets) &&
    isFiniteNumber(value.bonus) &&
    isFiniteNumber(value.bps) &&
    typeof value.ict_index === 'string'
  );
}

export function isPlayerHistoryPayload(value: unknown): value is { history: PlayerGameweekHistory[] } {
  return isRecord(value) && Array.isArray(value.history) && value.history.every(isHistoryEntry);
}

/**
 * Fetch history only for the player the user opened. No bulk history requests
 * are made when the main player list loads.
 */
export async function fetchPlayerHistory(playerId: number): Promise<PlayerHistoryResult> {
  if (!Number.isSafeInteger(playerId) || playerId <= 0) {
    return { status: 'unavailable', message: 'A valid player ID is required to load match history.' };
  }

  try {
    const response = await fetch(PLAYER_HISTORY_ENDPOINT + '?id=' + playerId, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.status === 404) return { status: 'not-found' };
    if (!response.ok) {
      return { status: 'unavailable', message: 'Player history is temporarily unavailable (HTTP ' + response.status + ').' };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { status: 'unavailable', message: 'The player history service returned invalid JSON.' };
    }

    if (!isPlayerHistoryPayload(payload)) {
      return { status: 'unavailable', message: 'The player history response had an unexpected format.' };
    }

    return { status: 'ok', history: payload.history };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
    return {
      status: 'unavailable',
      message: timedOut
        ? 'Loading player history timed out. Please try again.'
        : 'Player history could not be reached. Please try again.',
    };
  }
}
