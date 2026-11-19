import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getStartGameweek } from '../src/lib/fixtures.ts';
import {
  isFPLData,
  isFixtureArray,
  loadDashboardData,
  MOCK_FPL_DATA,
} from '../src/services/fplService.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const fixturePayload = [{
  id: 9001,
  event: 12,
  team_h: 1,
  team_a: 2,
  team_h_difficulty: 3,
  team_a_difficulty: 4,
  kickoff_time: '2026-11-20T15:00:00Z',
  finished: false,
}];

function mockFetch({ bootstrap = MOCK_FPL_DATA, fixtures = fixturePayload, bootstrapStatus = 200, fixturesStatus = 200 } = {}) {
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/bootstrap-static')) {
      return Response.json(bootstrap, { status: bootstrapStatus });
    }
    if (url.endsWith('/fixtures')) {
      return Response.json(fixtures, { status: fixturesStatus });
    }
    throw new Error('Unexpected FPL endpoint: ' + url);
  };
}

test('isFPLData accepts a structurally valid bootstrap payload', () => {
  assert.equal(isFPLData(MOCK_FPL_DATA), true);
});

test('isFPLData rejects missing collections and malformed player fields', () => {
  assert.equal(isFPLData({ ...MOCK_FPL_DATA, elements: [] }), false);
  const invalidPlayerData = {
    ...MOCK_FPL_DATA,
    elements: [{ ...MOCK_FPL_DATA.elements[0], total_points: '74' }],
  };
  assert.equal(isFPLData(invalidPlayerData), false);
});

test('isFixtureArray accepts valid fixtures and an empty list', () => {
  assert.equal(isFixtureArray(fixturePayload), true);
  assert.equal(isFixtureArray([]), true);
});

test('isFixtureArray rejects malformed fixture records', () => {
  assert.equal(isFixtureArray([{ ...fixturePayload[0], team_h_difficulty: 'hard' }]), false);
});

test('loadDashboardData returns live data when both feeds are valid', async () => {
  mockFetch();
  const result = await loadDashboardData();

  assert.equal(result.sourceStatus, 'live');
  assert.equal(result.isMock, false);
  assert.deepEqual(result.data, MOCK_FPL_DATA);
  assert.deepEqual(result.fixtures, fixturePayload);
  assert.equal(result.sourceMessage, null);
});

test('loadDashboardData preserves live players when the fixture feed fails', async () => {
  mockFetch({ fixturesStatus: 503 });
  const result = await loadDashboardData();

  assert.equal(result.sourceStatus, 'partial-live');
  assert.equal(result.isMock, false);
  assert.deepEqual(result.data, MOCK_FPL_DATA);
  assert.deepEqual(result.fixtures, []);
  assert.match(result.sourceMessage, /HTTP 503/);
});

test('loadDashboardData falls back to clearly labelled mock data when bootstrap fails', async () => {
  mockFetch({ bootstrapStatus: 502 });
  const result = await loadDashboardData();

  assert.equal(result.sourceStatus, 'mock');
  assert.equal(result.isMock, true);
  assert.deepEqual(result.data, MOCK_FPL_DATA);
  assert.ok(result.fixtures.length > 0);
  assert.match(result.sourceMessage, /demo data/i);
});

test('loadDashboardData rejects malformed JSON and returns a recoverable mock state', async () => {
  globalThis.fetch = async (input) => {
    if (String(input).endsWith('/bootstrap-static')) {
      return new Response('not-json', { status: 200 });
    }
    return Response.json(fixturePayload);
  };

  const result = await loadDashboardData();
  assert.equal(result.sourceStatus, 'mock');
  assert.match(result.sourceMessage, /invalid JSON/i);
});

test('loadDashboardData reports request timeouts without throwing', async () => {
  globalThis.fetch = async (input) => {
    if (String(input).endsWith('/bootstrap-static')) {
      throw new DOMException('request timed out', 'TimeoutError');
    }
    return Response.json(fixturePayload);
  };

  const result = await loadDashboardData();
  assert.equal(result.sourceStatus, 'mock');
  assert.match(result.sourceMessage, /timed out/i);
});

test('demo events never claim to be the current or next live gameweek', () => {
  assert.equal(MOCK_FPL_DATA.events.length, 38);
  assert.equal(MOCK_FPL_DATA.events.every((event) => !event.is_current && !event.is_next), true);
  assert.equal(MOCK_FPL_DATA.events.every((event) => !event.finished), true);
  assert.equal(MOCK_FPL_DATA.events[0].name, 'Demo Gameweek 1');
  assert.equal(getStartGameweek(MOCK_FPL_DATA.events), 1);
});

test('generated demo fixtures start at the first unfinished demo gameweek', async () => {
  mockFetch({ bootstrapStatus: 503 });
  const result = await loadDashboardData();
  const gameweeks = [...new Set(result.fixtures.map((fixture) => fixture.event))].sort((a, b) => a - b);

  assert.deepEqual(gameweeks, [1, 2, 3, 4, 5]);
  assert.equal(result.sourceStatus, 'mock');
});
