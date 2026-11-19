import type { DashboardData, FPLData, Fixture } from '../types/fpl';

// Same-origin proxy: a Vercel Function in production (api/fpl/[endpoint].ts)
// and a Vite dev-server proxy locally (vite.config.ts).
const API_BASE = '/api/fpl';

export const MOCK_FPL_DATA: FPLData = {
  events: Array.from({ length: 38 }, (_, i) => ({
    id: i + 1,
    name: `Gameweek ${i + 1}`,
    is_current: i + 1 === 8,
    is_next: i + 1 === 9,
    finished: i + 1 < 8,
  })),
  element_types: [
    { id: 1, singular_name_short: 'GKP' },
    { id: 2, singular_name_short: 'DEF' },
    { id: 3, singular_name_short: 'MID' },
    { id: 4, singular_name_short: 'FWD' },
  ],
  teams: [
    { id: 1, name: 'Arsenal', short_name: 'ARS', strength: 5 },
    { id: 2, name: 'Aston Villa', short_name: 'AVL', strength: 4 },
    { id: 3, name: 'Chelsea', short_name: 'CHE', strength: 4 },
    { id: 4, name: 'Liverpool', short_name: 'LIV', strength: 5 },
    { id: 5, name: 'Man City', short_name: 'MCI', strength: 5 },
    { id: 6, name: 'Man Utd', short_name: 'MUN', strength: 4 },
    { id: 7, name: 'Newcastle', short_name: 'NEW', strength: 4 },
    { id: 8, name: 'Tottenham', short_name: 'TOT', strength: 4 },
  ],
  elements: [
    { id: 1, first_name: 'Erling', second_name: 'Haaland', web_name: 'Haaland', team: 5, element_type: 4, now_cost: 152, total_points: 74, goals_scored: 10, assists: 2, clean_sheets: 0, form: '8.5', selected_by_percent: '72.4', bonus: 12, bps: 280, minutes: 630, ict_index: '92.4', ep_next: '8.2', news: '', status: 'a' },
    { id: 2, first_name: 'Mohamed', second_name: 'Salah', web_name: 'Salah', team: 4, element_type: 3, now_cost: 127, total_points: 68, goals_scored: 6, assists: 5, clean_sheets: 4, form: '7.8', selected_by_percent: '45.1', bonus: 10, bps: 254, minutes: 620, ict_index: '88.1', ep_next: '7.5', news: '', status: 'a' },
    { id: 3, first_name: 'Cole', second_name: 'Palmer', web_name: 'Palmer', team: 3, element_type: 3, now_cost: 108, total_points: 62, goals_scored: 6, assists: 4, clean_sheets: 3, form: '8.0', selected_by_percent: '52.3', bonus: 9, bps: 240, minutes: 590, ict_index: '84.0', ep_next: '7.1', news: '', status: 'a' },
    { id: 4, first_name: 'Bukayo', second_name: 'Saka', web_name: 'Saka', team: 1, element_type: 3, now_cost: 101, total_points: 58, goals_scored: 3, assists: 7, clean_sheets: 4, form: '7.2', selected_by_percent: '38.9', bonus: 7, bps: 215, minutes: 610, ict_index: '79.5', ep_next: '6.8', news: '', status: 'a' },
    { id: 5, first_name: 'Ollie', second_name: 'Watkins', web_name: 'Watkins', team: 2, element_type: 4, now_cost: 91, total_points: 49, goals_scored: 4, assists: 3, clean_sheets: 0, form: '6.1', selected_by_percent: '29.2', bonus: 5, bps: 180, minutes: 580, ict_index: '68.2', ep_next: '5.9', news: '', status: 'a' },
    { id: 6, first_name: 'Gabriel', second_name: 'Magalhães', web_name: 'Gabriel', team: 1, element_type: 2, now_cost: 62, total_points: 46, goals_scored: 2, assists: 0, clean_sheets: 4, form: '6.5', selected_by_percent: '26.8', bonus: 6, bps: 175, minutes: 630, ict_index: '51.0', ep_next: '5.5', news: '', status: 'a' },
    { id: 7, first_name: 'David', second_name: 'Raya', web_name: 'Raya', team: 1, element_type: 1, now_cost: 56, total_points: 42, goals_scored: 0, assists: 0, clean_sheets: 4, form: '5.8', selected_by_percent: '31.4', bonus: 4, bps: 160, minutes: 630, ict_index: '32.1', ep_next: '5.0', news: '', status: 'a' },
    { id: 8, first_name: 'Trent', second_name: 'Alexander-Arnold', web_name: 'Alexander-Arnold', team: 4, element_type: 2, now_cost: 71, total_points: 41, goals_scored: 0, assists: 3, clean_sheets: 4, form: '5.5', selected_by_percent: '30.1', bonus: 5, bps: 168, minutes: 570, ict_index: '62.4', ep_next: '5.2', news: '', status: 'a' },
  ]
};

const MOCK_FIXTURE_WINDOW = 5;

/** Deterministic round-robin schedule so the FDR view works offline. */
function buildMockFixtures(): Fixture[] {
  const currentEvent = MOCK_FPL_DATA.events.find((e) => e.is_current)?.id ?? 1;
  const teams = MOCK_FPL_DATA.teams;
  const [anchor, ...rest] = teams;
  const fixtures: Fixture[] = [];

  for (let round = 0; round < MOCK_FIXTURE_WINDOW; round++) {
    const shift = round % rest.length;
    const rotated = [anchor, ...rest.slice(shift), ...rest.slice(0, shift)];

    for (let i = 0; i < rotated.length / 2; i++) {
      const a = rotated[i];
      const b = rotated[rotated.length - 1 - i];
      const [home, away] = round % 2 === 0 ? [a, b] : [b, a];

      fixtures.push({
        id: round * 100 + i + 1,
        event: currentEvent + 1 + round,
        team_h: home.id,
        team_a: away.id,
        team_h_difficulty: away.strength,
        team_a_difficulty: home.strength,
        kickoff_time: null,
        finished: false,
      });
    }
  }

  return fixtures;
}


const API_TIMEOUT_MS = 12_000;

type ApiResult =
  | { ok: true; data: unknown }
  | { ok: false; message: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isString = (value: unknown): value is string => typeof value === 'string';

/**
 * Validate the subset of the bootstrap payload consumed by the dashboard.
 * Unknown extra fields are allowed so upstream additions remain backward compatible.
 */
export function isFPLData(value: unknown): value is FPLData {
  if (!isRecord(value)) return false;
  const { elements, teams, events, element_types: elementTypes } = value;

  return (
    Array.isArray(elements) &&
    elements.length > 0 &&
    elements.every((player) =>
      isRecord(player) &&
      isFiniteNumber(player.id) &&
      isString(player.first_name) &&
      isString(player.second_name) &&
      isString(player.web_name) &&
      isFiniteNumber(player.team) &&
      isFiniteNumber(player.element_type) &&
      isFiniteNumber(player.now_cost) &&
      isFiniteNumber(player.total_points) &&
      isFiniteNumber(player.goals_scored) &&
      isFiniteNumber(player.assists) &&
      isFiniteNumber(player.clean_sheets) &&
      isString(player.form) &&
      isString(player.selected_by_percent) &&
      isFiniteNumber(player.bonus) &&
      isFiniteNumber(player.bps) &&
      isFiniteNumber(player.minutes) &&
      isString(player.ict_index) &&
      isString(player.ep_next) &&
      isString(player.news) &&
      isString(player.status)
    ) &&
    Array.isArray(teams) &&
    teams.length > 0 &&
    teams.every((team) =>
      isRecord(team) &&
      isFiniteNumber(team.id) &&
      isString(team.name) &&
      isString(team.short_name) &&
      isFiniteNumber(team.strength)
    ) &&
    Array.isArray(events) &&
    events.every((event) =>
      isRecord(event) &&
      isFiniteNumber(event.id) &&
      isString(event.name) &&
      typeof event.is_current === 'boolean' &&
      typeof event.is_next === 'boolean' &&
      typeof event.finished === 'boolean'
    ) &&
    Array.isArray(elementTypes) &&
    elementTypes.length > 0 &&
    elementTypes.every((elementType) =>
      isRecord(elementType) &&
      isFiniteNumber(elementType.id) &&
      isString(elementType.singular_name_short)
    )
  );
}

/** Reject malformed fixtures before they reach FDR calculations and rendering. */
export function isFixtureArray(value: unknown): value is Fixture[] {
  return (
    Array.isArray(value) &&
    value.every((fixture) =>
      isRecord(fixture) &&
      isFiniteNumber(fixture.id) &&
      (fixture.event === null || isFiniteNumber(fixture.event)) &&
      isFiniteNumber(fixture.team_h) &&
      isFiniteNumber(fixture.team_a) &&
      isFiniteNumber(fixture.team_h_difficulty) &&
      isFiniteNumber(fixture.team_a_difficulty) &&
      (fixture.kickoff_time === null || isString(fixture.kickoff_time)) &&
      typeof fixture.finished === 'boolean'
    )
  );
}

async function getJson(endpoint: string): Promise<ApiResult> {
  try {
    const response = await fetch(API_BASE + '/' + endpoint, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });

    if (!response.ok) {
      return { ok: false, message: 'The FPL service returned HTTP ' + response.status + ' for ' + endpoint + '.' };
    }

    try {
      return { ok: true, data: await response.json() };
    } catch {
      return { ok: false, message: 'The FPL service returned invalid JSON for ' + endpoint + '.' };
    }
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
    return {
      ok: false,
      message: timedOut
        ? 'The FPL request for ' + endpoint + ' timed out. Please try again.'
        : 'The FPL service is currently unreachable for ' + endpoint + '. Please try again.',
    };
  }
}

/**
 * Load bootstrap and fixture feeds independently. A fixture outage should not
 * discard valid player data, and malformed upstream payloads never reach the UI.
 */
export async function loadDashboardData(): Promise<DashboardData> {
  const [bootstrapResult, fixtureResult] = await Promise.all([
    getJson('bootstrap-static'),
    getJson('fixtures'),
  ]);

  if (!bootstrapResult.ok || !isFPLData(bootstrapResult.data)) {
    const reason = bootstrapResult.ok
      ? 'The FPL bootstrap response was incomplete or had an unexpected format.'
      : bootstrapResult.message;

    return {
      data: MOCK_FPL_DATA,
      fixtures: buildMockFixtures(),
      isMock: true,
      sourceStatus: 'mock',
      sourceMessage: reason + ' Showing illustrative demo data instead of live statistics.',
    };
  }

  if (!fixtureResult.ok || !isFixtureArray(fixtureResult.data)) {
    const reason = fixtureResult.ok
      ? 'The FPL fixtures response was incomplete or had an unexpected format.'
      : fixtureResult.message;

    return {
      data: bootstrapResult.data,
      fixtures: [],
      isMock: false,
      sourceStatus: 'partial-live',
      sourceMessage: reason + ' Player statistics are live, but fixture analysis is temporarily unavailable.',
    };
  }

  return {
    data: bootstrapResult.data,
    fixtures: fixtureResult.data,
    isMock: false,
    sourceStatus: 'live',
    sourceMessage: null,
  };
}
