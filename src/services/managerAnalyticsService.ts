import type {
  LeagueStandings,
  LeagueStandingsResult,
  ManagerEventHistory,
  ManagerOverviewResult,
  ManagerProfile,
} from '../types/managerAnalytics';

const PROFILE_ENDPOINT = '/api/manager-profile';
const HISTORY_ENDPOINT = '/api/manager-history';
const LEAGUE_ENDPOINT = '/api/league-standings';
const REQUEST_TIMEOUT_MS = 10_000;

type ApiResult = { status: 'ok'; data: unknown } | { status: 'not-found' } | { status: 'error'; message: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isNullableNumber = (value: unknown): value is number | null =>
  value === null || isFiniteNumber(value);

async function requestJson(url: string): Promise<ApiResult> {
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.status === 404) return { status: 'not-found' };
    if (!response.ok) return { status: 'error', message: 'The FPL service returned HTTP ' + response.status + '.' };

    try {
      return { status: 'ok', data: await response.json() };
    } catch {
      return { status: 'error', message: 'The FPL service returned invalid JSON.' };
    }
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
    return {
      status: 'error',
      message: timedOut ? 'The FPL request timed out. Please try again.' : 'The FPL service could not be reached.',
    };
  }
}

export function isManagerProfile(value: unknown): value is ManagerProfile {
  if (!isRecord(value) || !isRecord(value.leagues)) return false;
  const classic = value.leagues.classic;
  return (
    isFiniteNumber(value.id) &&
    typeof value.player_first_name === 'string' &&
    typeof value.player_last_name === 'string' &&
    typeof value.name === 'string' &&
    isNullableNumber(value.summary_overall_points) &&
    isNullableNumber(value.summary_overall_rank) &&
    isNullableNumber(value.summary_event_points) &&
    isNullableNumber(value.summary_event_rank) &&
    isNullableNumber(value.current_event) &&
    Array.isArray(classic) &&
    classic.every((league) =>
      isRecord(league) &&
      isFiniteNumber(league.id) &&
      typeof league.name === 'string' &&
      isNullableNumber(league.rank) &&
      typeof league.league_type === 'string'
    )
  );
}

export function isManagerHistory(value: unknown): value is { current: ManagerEventHistory[] } {
  return (
    isRecord(value) &&
    Array.isArray(value.current) &&
    value.current.every((entry) =>
      isRecord(entry) &&
      isFiniteNumber(entry.event) &&
      isFiniteNumber(entry.points) &&
      isFiniteNumber(entry.total_points) &&
      isNullableNumber(entry.overall_rank)
    )
  );
}

export function isLeagueStandings(value: unknown): value is { standings: LeagueStandings } {
  if (!isRecord(value) || !isRecord(value.standings)) return false;
  const standings = value.standings;
  return (
    isFiniteNumber(standings.page) &&
    typeof standings.has_next === 'boolean' &&
    Array.isArray(standings.results) &&
    standings.results.every((entry) =>
      isRecord(entry) &&
      isFiniteNumber(entry.id) &&
      isFiniteNumber(entry.rank) &&
      isFiniteNumber(entry.last_rank) &&
      typeof entry.player_name === 'string' &&
      isFiniteNumber(entry.event_total) &&
      isFiniteNumber(entry.total) &&
      isFiniteNumber(entry.entry) &&
      typeof entry.entry_name === 'string'
    )
  );
}

/** Fetch public profile and season history in parallel for one manager. */
export async function fetchManagerOverview(managerId: number): Promise<ManagerOverviewResult> {
  if (!Number.isSafeInteger(managerId) || managerId <= 0) {
    return { status: 'unavailable', message: 'Enter a valid numeric FPL manager ID.' };
  }

  const [profileResult, historyResult] = await Promise.all([
    requestJson(PROFILE_ENDPOINT + '?id=' + managerId),
    requestJson(HISTORY_ENDPOINT + '?id=' + managerId),
  ]);

  if (profileResult.status === 'not-found') return { status: 'not-found' };
  if (profileResult.status === 'error') return { status: 'unavailable', message: profileResult.message };
  if (!isManagerProfile(profileResult.data)) {
    return { status: 'unavailable', message: 'The manager profile response had an unexpected format.' };
  }

  if (historyResult.status === 'ok' && isManagerHistory(historyResult.data)) {
    return {
      status: 'ok',
      profile: profileResult.data,
      history: historyResult.data.current,
      historyMessage: null,
    };
  }

  const historyMessage = historyResult.status === 'error'
    ? historyResult.message
    : historyResult.status === 'not-found'
      ? 'Season history was not found for this manager.'
      : 'The manager history response had an unexpected format.';

  return {
    status: 'ok',
    profile: profileResult.data,
    history: [],
    historyMessage,
  };
}

/** Fetch one page of public classic-league standings. */
export async function fetchLeagueStandings(leagueId: number, page = 1): Promise<LeagueStandingsResult> {
  if (!Number.isSafeInteger(leagueId) || leagueId <= 0 || !Number.isInteger(page) || page < 1 || page > 100) {
    return { status: 'unavailable', message: 'Enter a valid league ID and page number.' };
  }

  const result = await requestJson(LEAGUE_ENDPOINT + '?id=' + leagueId + '&page=' + page);
  if (result.status === 'not-found') return { status: 'not-found' };
  if (result.status === 'error') return { status: 'unavailable', message: result.message };
  if (!isLeagueStandings(result.data)) {
    return { status: 'unavailable', message: 'The league standings response had an unexpected format.' };
  }

  return { status: 'ok', data: result.data.standings };
}
