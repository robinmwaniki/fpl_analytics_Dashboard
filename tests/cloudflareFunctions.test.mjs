import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet as getFpl } from '../functions/api/fpl/[endpoint].ts';
import { onRequestGet as getPlayerHistory } from '../functions/api/player-history.ts';
import { onRequestGet as getManagerProfile } from '../functions/api/manager-profile.ts';
import { onRequestGet as getManagerHistory } from '../functions/api/manager-history.ts';
import { onRequestGet as getLeagueStandings } from '../functions/api/league-standings.ts';
import { onRequestGet as getTeamPicks } from '../functions/api/team-picks.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function context(url, params = {}) {
  return { request: new Request(url), params };
}

test('FPL route proxies only explicitly allowed endpoints', async () => {
  let requestedUrl = '';
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return Response.json({ events: [] });
  };

  const response = await getFpl(context('https://dashboard.test/api/fpl/bootstrap-static', {
    endpoint: 'bootstrap-static',
  }));

  assert.equal(response.status, 200);
  assert.equal(requestedUrl, 'https://fantasy.premierleague.com/api/bootstrap-static/');
  assert.match(response.headers.get('Cache-Control') ?? '', /s-maxage=300/);

  const rejected = await getFpl(context('https://dashboard.test/api/fpl/anything', {
    endpoint: 'anything',
  }));
  assert.equal(rejected.status, 404);
});

test('player history validates IDs and builds a fixed upstream path', async () => {
  let requestedUrl = '';
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return Response.json({ history: [] });
  };

  const invalid = await getPlayerHistory(context('https://dashboard.test/api/player-history?id=1%2F..%2Fadmin'));
  assert.equal(invalid.status, 400);
  assert.equal(requestedUrl, '');

  const valid = await getPlayerHistory(context('https://dashboard.test/api/player-history?id=123'));
  assert.equal(valid.status, 200);
  assert.equal(requestedUrl, 'https://fantasy.premierleague.com/api/element-summary/123/');
});

test('manager profile and history validate IDs and use their respective endpoints', async () => {
  const requested = [];
  globalThis.fetch = async (input) => {
    requested.push(String(input));
    return Response.json({ ok: true });
  };

  assert.equal((await getManagerProfile(context('https://dashboard.test/api/manager-profile?id=0'))).status, 400);
  assert.equal((await getManagerHistory(context('https://dashboard.test/api/manager-history?id=42'))).status, 200);
  assert.equal((await getManagerProfile(context('https://dashboard.test/api/manager-profile?id=42'))).status, 200);

  assert.deepEqual(requested, [
    'https://fantasy.premierleague.com/api/entry/42/history/',
    'https://fantasy.premierleague.com/api/entry/42/',
  ]);
});

test('league standings rejects invalid page values and encodes valid pagination', async () => {
  let requestedUrl = '';
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return Response.json({ standings: { results: [] } });
  };

  assert.equal((await getLeagueStandings(context('https://dashboard.test/api/league-standings?id=5&page=1.5'))).status, 400);
  assert.equal((await getLeagueStandings(context('https://dashboard.test/api/league-standings?id=5&page=101'))).status, 400);

  const response = await getLeagueStandings(context('https://dashboard.test/api/league-standings?id=5&page=2'));
  assert.equal(response.status, 200);
  assert.equal(requestedUrl, 'https://fantasy.premierleague.com/api/leagues-classic/5/standings/?page_standings=2');
});

test('team picks validates manager ID and gameweek bounds', async () => {
  let requestedUrl = '';
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return Response.json({ picks: [] });
  };

  assert.equal((await getTeamPicks(context('https://dashboard.test/api/team-picks?id=1&gw=39'))).status, 400);
  assert.equal((await getTeamPicks(context('https://dashboard.test/api/team-picks?id=1&gw=6'))).status, 200);
  assert.equal(requestedUrl, 'https://fantasy.premierleague.com/api/entry/1/event/6/picks/');
});

test('Cloudflare proxy preserves upstream not-found responses', async () => {
  globalThis.fetch = async () => new Response(null, { status: 404 });

  const response = await getPlayerHistory(context('https://dashboard.test/api/player-history?id=123'));
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Player history not found' });
});

test('Cloudflare proxy converts upstream and network failures into safe 502 responses', async () => {
  globalThis.fetch = async () => new Response('upstream error', { status: 503 });
  const upstreamFailure = await getManagerProfile(context('https://dashboard.test/api/manager-profile?id=12'));
  assert.equal(upstreamFailure.status, 502);
  assert.match(upstreamFailure.headers.get('Cache-Control') ?? '', /no-store/);

  globalThis.fetch = async () => {
    throw new Error('network unavailable');
  };
  const networkFailure = await getManagerHistory(context('https://dashboard.test/api/manager-history?id=12'));
  assert.equal(networkFailure.status, 502);
  assert.deepEqual(await networkFailure.json(), { error: 'FPL API is unreachable' });
});
