import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchPlayerHistory,
  isPlayerHistoryPayload,
} from '../src/services/playerHistoryService.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const history = [{
  element: 123,
  fixture: 9001,
  opponent_team: 1,
  total_points: 8,
  was_home: true,
  kickoff_time: '2026-11-15T14:00:00Z',
  round: 12,
  minutes: 90,
  goals_scored: 1,
  assists: 0,
  clean_sheets: 1,
  bonus: 2,
  bps: 30,
  ict_index: '18.2',
}];

test('isPlayerHistoryPayload validates the history records used by the UI', () => {
  assert.equal(isPlayerHistoryPayload({ history }), true);
  assert.equal(isPlayerHistoryPayload({ history: [] }), true);
  assert.equal(isPlayerHistoryPayload({ history: [{ ...history[0], total_points: '8' }] }), false);
  assert.equal(isPlayerHistoryPayload({}), false);
});

test('fetchPlayerHistory requests only the selected player ID', async () => {
  let requestedUrl = '';
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return Response.json({ history });
  };

  const result = await fetchPlayerHistory(123);
  assert.equal(requestedUrl, '/api/player-history?id=123');
  assert.deepEqual(result, { status: 'ok', history });
});

test('fetchPlayerHistory rejects invalid IDs before making a request', async () => {
  let requested = false;
  globalThis.fetch = async () => {
    requested = true;
    return Response.json({ history });
  };

  const result = await fetchPlayerHistory(0);
  assert.equal(result.status, 'unavailable');
  assert.equal(requested, false);
});

test('fetchPlayerHistory returns not-found for a missing player', async () => {
  globalThis.fetch = async () => new Response(null, { status: 404 });
  assert.deepEqual(await fetchPlayerHistory(123), { status: 'not-found' });
});

test('fetchPlayerHistory reports upstream HTTP failures', async () => {
  globalThis.fetch = async () => Response.json({ error: 'upstream unavailable' }, { status: 502 });
  const result = await fetchPlayerHistory(123);
  assert.equal(result.status, 'unavailable');
  assert.match(result.message, /HTTP 502/);
});

test('fetchPlayerHistory rejects malformed JSON and malformed payloads', async () => {
  globalThis.fetch = async () => new Response('not-json', { status: 200 });
  const invalidJson = await fetchPlayerHistory(123);
  assert.equal(invalidJson.status, 'unavailable');
  assert.match(invalidJson.message, /invalid JSON/i);

  globalThis.fetch = async () => Response.json({ history: [{ ...history[0], round: '12' }] });
  const invalidPayload = await fetchPlayerHistory(123);
  assert.equal(invalidPayload.status, 'unavailable');
  assert.match(invalidPayload.message, /unexpected format/i);
});

test('fetchPlayerHistory converts network failures into a recoverable result', async () => {
  globalThis.fetch = async () => {
    throw new Error('network unavailable');
  };

  const result = await fetchPlayerHistory(123);
  assert.equal(result.status, 'unavailable');
  assert.match(result.message, /could not be reached/i);
});
