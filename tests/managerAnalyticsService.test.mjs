import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchLeagueStandings,
  fetchManagerOverview,
  isLeagueStandings,
  isManagerHistory,
  isManagerProfile,
} from '../src/services/managerAnalyticsService.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const profile = {
  id: 12345,
  player_first_name: 'Robin',
  player_last_name: 'Manager',
  name: 'Analytics FC',
  summary_overall_points: 1200,
  summary_overall_rank: 25000,
  summary_event_points: 65,
  summary_event_rank: 100000,
  current_event: 12,
  leagues: {
    classic: [{ id: 900, name: 'Friends League', rank: 3, league_type: 'x' }],
  },
};

const history = {
  current: [
    { event: 11, points: 58, total_points: 1135, overall_rank: 27000 },
    { event: 12, points: 65, total_points: 1200, overall_rank: 25000 },
  ],
};

const standings = {
  standings: {
    page: 1,
    has_next: true,
    results: [{
      id: 1,
      rank: 1,
      last_rank: 2,
      player_name: 'Top Manager',
      event_total: 70,
      total: 1300,
      entry: 456,
      entry_name: 'Top Team',
    }],
  },
};

test('manager validators accept well-formed public profile, history and standings payloads', () => {
  assert.equal(isManagerProfile(profile), true);
  assert.equal(isManagerHistory(history), true);
  assert.equal(isLeagueStandings(standings), true);
});

test('manager validators reject malformed or incomplete payloads', () => {
  assert.equal(isManagerProfile({ ...profile, summary_overall_rank: '25000' }), false);
  assert.equal(isManagerHistory({ current: [{ ...history.current[0], points: '58' }] }), false);
  assert.equal(isLeagueStandings({ standings: { ...standings.standings, results: [{ ...standings.standings.results[0], total: '1300' }] } }), false);
});

test('fetchManagerOverview requests public profile and season history for the same manager', async () => {
  const requested = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    requested.push(url);
    return url.startsWith('/api/manager-profile')
      ? Response.json(profile)
      : Response.json(history);
  };

  const result = await fetchManagerOverview(12345);
  assert.deepEqual(requested.sort(), [
    '/api/manager-history?id=12345',
    '/api/manager-profile?id=12345',
  ]);
  assert.equal(result.status, 'ok');
  if (result.status === 'ok') {
    assert.equal(result.profile.name, 'Analytics FC');
    assert.deepEqual(result.history, history.current);
  }
});

test('fetchManagerOverview keeps a valid profile when history is unavailable', async () => {
  globalThis.fetch = async (input) => String(input).startsWith('/api/manager-profile')
    ? Response.json(profile)
    : Response.json({ error: 'unavailable' }, { status: 502 });

  const result = await fetchManagerOverview(12345);
  assert.equal(result.status, 'ok');
  if (result.status === 'ok') {
    assert.deepEqual(result.history, []);
    assert.match(result.historyMessage, /HTTP 502/);
  }
});

test('fetchManagerOverview handles missing and invalid manager IDs', async () => {
  globalThis.fetch = async () => new Response(null, { status: 404 });
  assert.deepEqual(await fetchManagerOverview(12345), { status: 'not-found' });

  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return Response.json(profile);
  };
  const invalid = await fetchManagerOverview(0);
  assert.equal(invalid.status, 'unavailable');
  assert.equal(called, false);
});

test('fetchLeagueStandings sends the requested page and returns pagination metadata', async () => {
  let requestedUrl = '';
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return Response.json(standings);
  };

  const result = await fetchLeagueStandings(900, 2);
  assert.equal(requestedUrl, '/api/league-standings?id=900&page=2');
  assert.equal(result.status, 'ok');
  if (result.status === 'ok') {
    assert.equal(result.data.page, 1);
    assert.equal(result.data.has_next, true);
    assert.equal(result.data.results[0].entry, 456);
  }
});

test('fetchLeagueStandings rejects invalid IDs and page numbers without requesting data', async () => {
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return Response.json(standings);
  };

  const invalidId = await fetchLeagueStandings(0, 1);
  const invalidPage = await fetchLeagueStandings(900, 0);
  assert.equal(invalidId.status, 'unavailable');
  assert.equal(invalidPage.status, 'unavailable');
  assert.equal(called, false);
});

test('fetchLeagueStandings handles not-found and malformed responses', async () => {
  globalThis.fetch = async () => new Response(null, { status: 404 });
  assert.deepEqual(await fetchLeagueStandings(900), { status: 'not-found' });

  globalThis.fetch = async () => Response.json({ standings: { page: 1, has_next: 'yes', results: [] } });
  const invalid = await fetchLeagueStandings(900);
  assert.equal(invalid.status, 'unavailable');
  assert.match(invalid.message, /unexpected format/i);
});
